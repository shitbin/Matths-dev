//  SyncEngine.swift
//  Matths
//
//  로컬 우선 동기화 — 앱은 언제나 로컬에 먼저 쓰고, 서버 전송은 큐에 쌓아
//  온라인일 때 순차로 올린다. 비행기 모드에서도 학습이 멈추지 않아야 한다.
//
//  규약
//   - 멱등: 모든 작업에 클라이언트가 만든 id 를 실어 보낸다. 같은 큐를 두 번
//     올려도 서버가 걸러낸다(서버 ipadSyncController 와 짝).
//   - 단조: 진도·유형 게이트는 더하기만 한다. 어느 쪽도 상대의 성과를 지우지 않는다.
//   - 게이트는 둘로 갈라 본다 (S-02·B-09 감사 반영):
//       적재(enqueue) = 계정 정체성(isServerAccountSlot) — 게스트는 아무것도 쌓지 않는다.
//       전송(flush/pull) = 정체성 + 키체인 토큰(canReachServer).
//     토큰 존재만으로 게이트하면 안 된다: 키체인은 앱 삭제 후에도 살아남아
//     재설치한 게스트가 이전 계정 토큰으로 오르내리는 계정 간 오염이 생기고,
//     반대로 401 만료 구간에는 기록이 큐에도 못 쌓여 영구 유실된다.
//   - 계정 격리: 큐는 슬롯(계정)별 파일이고, 메모리 큐도 슬롯이 바뀌면 갈아끼운다.
//     앞 계정의 op 를 뒷 계정 토큰으로 올리면 남의 기록이 된다.
//   - 큐는 Documents/slots/<슬롯>/sync-queue.jsonl (append-only). 앱을 꺼도 남는다.
//   - 독성 op 는 sync-deadletter.jsonl 로 격리한다(버리지 않는다 — 증거·수동 재생 여지).
//   - 서버→로컬 pull 은 onRemoteWrongNotes 수신부가 걸려 있을 때만 돈다
//     (받아 줄 곳 없이 커서만 밀면 그 구간 오답을 영영 못 받는다).

import Foundation
import Network
#if canImport(UIKit)
import UIKit
#endif

// MARK: - 큐 항목

struct SyncOp: Codable, Identifiable {
    enum Kind: String, Codable {
        case mastery        // 유형 게이트 적립
        case topic          // 토픽 체크/해제
        case progressSnapshot // 게스트→계정 진도 무이벤트 병합
        case event          // 학습 이벤트
        case gradingBatch   // 평가·기출 여러 문항의 정오 이벤트
        case wrongNote      // 오답 적재
        case reviewResult   // 복습 결과(SRS)
        case stuckPoint     // 보호 화면 캡처 뒤 학생이 적은 막힌 지점
        case progressReset  // 계정 진도 초기화(요청 시각 이전만)
    }
    var id: String = UUID().uuidString
    var kind: Kind
    var payload: [String: SyncValue]
    var createdAt: Date = Date()
    /// 이 op 를 만든 계정 슬롯(DataScope.slot). 계정이 바뀐 뒤 남아 있던 op 가
    /// 뒷사람 토큰으로 올라가지 않게 하는 표식이다. 슬롯 이름이 acct-<이메일 해시>라
    /// 사실상 계정 식별자다 — flush 직전 belongsToCurrentAccount 가 대조한다.
    /// 옵셔널인 이유: 이 필드가 없던 시절의 큐 파일도 그대로 읽혀야 한다.
    var slot: String?
    /// 서버가 영구 거부(4xx)한 횟수. 상한을 넘으면 deadletter 로 격리된다 —
    /// 독성 op 하나가 FIFO 맨 앞에서 뒤의 모든 기록 전송을 영원히 막지 않게 (B-09).
    /// 옵셔널인 이유: slot 과 같다(구 큐 파일 호환).
    var attemptCount: Int?
}

/// JSON 한 겹만 담으면 되므로 최소 타입만 지원한다 (Codable 을 위해 필요)
enum SyncValue: Codable {
    case s(String), i(Int), b(Bool), sa([String]), ia([Int])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(String.self) { self = .s(v); return }
        if let v = try? c.decode(Int.self) { self = .i(v); return }
        if let v = try? c.decode(Bool.self) { self = .b(v); return }
        if let v = try? c.decode([String].self) { self = .sa(v); return }
        if let v = try? c.decode([Int].self) { self = .ia(v); return }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "지원하지 않는 값")
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .s(let v): try c.encode(v)
        case .i(let v): try c.encode(v)
        case .b(let v): try c.encode(v)
        case .sa(let v): try c.encode(v)
        case .ia(let v): try c.encode(v)
        }
    }
    var any: Any {
        switch self {
        case .s(let v): return v
        case .i(let v): return v
        case .b(let v): return v
        case .sa(let v): return v
        case .ia(let v): return v
        }
    }
}

// MARK: - 엔진

@MainActor
final class SyncEngine: ObservableObject {
    static let shared = SyncEngine()

    @Published private(set) var pending = 0
    @Published private(set) var lastSyncedAt: Date?
    @Published private(set) var lastError: String?
    /// deadletter 로 격리된 op 수 — pending 과 분리해 노출한다.
    /// "대기 N건" 에 섞으면 영영 안 올라갈 건수가 곧 올라갈 것처럼 보인다.
    @Published private(set) var deadLettered = 0
    /// 큐 파일에서 디코딩에 실패해 격리 보존된 줄 수 — 0 이 아니면 학습 기록
    /// 일부가 서버에 못 올라간 상태라는 뜻이다(관찰 가능해야 복구도 한다).
    @Published private(set) var quarantinedLines = 0

    private var queue: [SyncOp] = []
    private var flushing = false
    private var pulling = false
    private var progressPulling = false
    private var stuckPointPulling = false
    private var lastPullAt: Date?

    /// 지금 메모리에 들고 있는 큐의 주인 슬롯. DataScope.slot 과 어긋나면
    /// 로그아웃·계정 전환이 있었다는 뜻이라 큐를 통째로 갈아끼운다.
    private var loadedSlot: String = DataScope.slot

    /// 깨우기 타이머·경로 감시 — 오프라인에 쌓인 큐가 "다음 채점" 까지 잠들지 않게 한다.
    /// 둘 다 프로퍼티로 붙들어 둔다(지역 변수로 두면 감시가 곧바로 사라진다).
    private var wakeTimer: Timer?
    private let pathMonitor = NWPathMonitor()

    /// (clientAttemptId, serverAttemptId) — AppStore 가 오답노트에 적어 넣는다.
    /// SyncEngine 이 오답노트 배열을 직접 만지지 않게 하려고 콜백으로 뺐다.
    var onServerID: ((String, String) -> Void)?

    /// 서버에서 내려온 오답을 로컬 오답노트에 합쳐 넣는 수신부(AppStore 가 건다).
    /// 오답노트 배열의 주인은 AppStore 다 — SyncEngine 이 디스크에 직접 쓰면
    /// AppStore 가 들고 있던 옛 배열을 다음 저장 때 덮어써 pull 한 것이 사라진다.
    var onRemoteWrongNotes: (([WrongNoteEntry]) -> Void)?
    /// 서버 진도 수신부 — AppStore 가 합친다(덮지 않는다).
    /// 오답과 같은 규약: 받는 쪽이 걸려 있을 때만 pull 한다.
    var onRemoteProgress: (([ServerAPI.RemoteConceptProgress]) -> Void)?
    var onRemoteStuckPoints: (([ServerAPI.RemoteStuckPoint]) -> Void)?

    private static var queueURL: URL {
        DataScope.url("sync-queue.jsonl")
    }

    /// pull 커서(마지막으로 받은 오답의 시각)는 계정별로 따로 둔다.
    private static var pullCursorKey: String { "matths.sync.lastPull." + DataScope.slot }

    // MARK: 게이트 (모든 guard 는 이 두 프로퍼티만 본다 — S-02 단일화)

    /// 적재 게이트 — **계정 정체성**. 지금 슬롯이 서버 계정인가.
    /// ServerAPI.hasToken 으로 게이트하면 안 되는 이유:
    ///  - 키체인 토큰은 앱 삭제 후에도 살아남는다. 재설치 후 게스트로 들어온 기기에서
    ///    토큰만 보고 통과시키면 게스트 기록이 이전 계정으로 올라가고, 이전 계정의
    ///    오답·진도가 게스트 슬롯으로 내려온다 — 양방향 계정 오염 (S-02).
    ///  - 401 로 토큰이 지워진 만료 구간에는 계정은 그대로인데 기록이 큐에도 못 쌓여
    ///    영구 유실된다 (B-09). 만료 중에도 쌓고, 보내는 것만 멈추면 된다.
    private var isServerAccountSlot: Bool { DataScope.slot != "guest" }

    /// 전송 게이트 — 정체성 + 토큰. 토큰이 없으면(만료) 큐를 지키며 기다린다.
    private var canReachServer: Bool { isServerAccountSlot && ServerAPI.hasToken }

    /// 독성 4xx 허용 재시도 상한 — 이 횟수를 **초과**하면 deadletter 로 격리한다.
    private static let maxToxicAttempts = 3

    private init() {
        let loaded = Self.loadQueue()
        queue = loaded.ops
        pending = queue.count
        quarantinedLines = loaded.quarantined
        deadLettered = Self.deadLetterCount()
        if loaded.quarantined > 0 {
            lastError = "전송하지 못한 기록 \(loaded.quarantined)건을 격리 보존했습니다."
        }
        startWakeups()
        // 앱을 껐다 켠 경우 — 세션은 UserDefaults 에서 곧장 복원되므로 로그인 경로를
        // 다시 타지 않는다. 여기서 한 번 밀어 올리지 않으면 어제 오프라인에서 쌓인
        // 큐가 다음 채점 전까지 그대로 잠들어 있다.
        Task { await syncNow() }
    }

    // MARK: 깨우기 (전송 기회)

    /// 큐는 "쌓일 때" 말고도 올라갈 기회가 있어야 한다.
    ///  - 포그라운드 복귀: 비행기 모드로 공부하다 나갔다 돌아온 순간
    ///  - 네트워크 복구: 온라인이 되는 즉시
    ///  - 60초 타이머: 앱을 켠 채 로그인만 한 경우(계정 전환 직후 pull 포함)
    private func startWakeups() {
        #if canImport(UIKit)
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { _ in
            Task { @MainActor in await SyncEngine.shared.syncNow() }
        }
        #endif

        pathMonitor.pathUpdateHandler = { path in
            guard path.status == .satisfied else { return }
            Task { @MainActor in await SyncEngine.shared.syncNow() }
        }
        pathMonitor.start(queue: DispatchQueue(label: "kr.matths.sync.path"))

        // 화면이 떠 있는 동안만 도는 런루프 타이머다(백그라운드에서는 멈춘다).
        // 큐가 비어 있으면 flush 가 즉시 되돌아오고 pull 은 간격 제한에 걸려,
        // 평소에는 사실상 아무 일도 하지 않는다.
        wakeTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
            Task { @MainActor in await SyncEngine.shared.syncNow() }
        }
    }

    /// 올릴 것을 올리고, 내려받을 것을 내려받는다.
    func syncNow() async {
        await flush()
        await pullWrongNotes()
        await pullProgress()
        await pullStuckPoints()
    }

    func pullStuckPoints() async {
        guard let handler = onRemoteStuckPoints else { return }
        guard canReachServer, !stuckPointPulling else { return }
        stuckPointPulling = true
        defer { stuckPointPulling = false }
        let slot = DataScope.slot
        do {
            let rows = try await ServerAPI.getStuckPoints()
            guard slot == DataScope.slot else { return }
            handler(rows)
            lastSyncedAt = Date()
            lastError = nil
        } catch {
            lastError = (error as? ServerAPIError)?.errorDescription ?? "\(error)"
        }
    }

    /// 서버가 가진 진도를 받아 온다 — 올리기만 하던 단방향을 닫는다.
    /// 합치는 일은 AppStore(onRemoteProgress)가 한다.
    func pullProgress() async {
        guard let handler = onRemoteProgress else { return }
        // canReachServer: 게스트 슬롯 + 잔존 토큰 조합으로 이전 계정의 진도를
        // 게스트 슬롯에 붓는 경로를 막는다 (S-02).
        guard canReachServer, !progressPulling else { return }
        progressPulling = true
        defer { progressPulling = false }
        let slot = DataScope.slot
        do {
            let rows = try await ServerAPI.getLearning()
            // 응답을 기다리는 사이 계정이 바뀌었으면 다른 사람 진도를 합치지 않는다.
            guard slot == DataScope.slot else { return }
            if !rows.isEmpty { handler(rows) }
            lastSyncedAt = Date()
            lastError = nil
        } catch {
            lastError = (error as? ServerAPIError)?.errorDescription ?? "\(error)"
        }
    }

    /// 메모리 큐의 주인이 현재 계정이 아니면 현재 슬롯 파일로 갈아끼운다.
    /// 앞 계정 op 는 그쪽 슬롯 파일에 그대로 남아, 다시 로그인하면 이어서 올라간다.
    private func syncSlotIfNeeded() {
        guard loadedSlot != DataScope.slot else { return }
        loadedSlot = DataScope.slot
        let loaded = Self.loadQueue()
        queue = loaded.ops
        pending = queue.count
        quarantinedLines = loaded.quarantined
        deadLettered = Self.deadLetterCount()
        lastPullAt = nil        // 새 계정이니 pull 간격 제한을 처음부터 다시 센다
    }

    /// 이 op 가 지금 로그인된 계정의 것인가 (아니면 보내지 않는다)
    private func belongsToCurrentAccount(_ op: SyncOp) -> Bool {
        loadedSlot == DataScope.slot && (op.slot ?? loadedSlot) == DataScope.slot
    }

    // MARK: 적재 (호출부는 이것만 쓴다)

    /// 유형 게이트 — 개념 연습에서 새 유형을 맞혔을 때
    func enqueueMastery(courseId: String, unitId: String, conceptId: String, typeKey: String) {
        enqueueMasteryUpdate(courseId: courseId, unitId: unitId, conceptId: conceptId,
                             addTypeIds: [typeKey], userCompleted: false)
    }

    /// 학생이 유형 게이트를 채운 뒤 누른 최종 완료 체크(90% → 100%).
    func enqueueConceptCompletion(courseId: String, unitId: String, conceptId: String) {
        enqueueMasteryUpdate(courseId: courseId, unitId: unitId, conceptId: conceptId,
                             addTypeIds: [], userCompleted: true)
    }

    private func enqueueMasteryUpdate(courseId: String, unitId: String, conceptId: String,
                                      addTypeIds: [String], userCompleted: Bool) {
        var payload: [String: SyncValue] = [
            "courseId": .s(courseId), "unitId": .s(unitId),
            "conceptId": .s(conceptId),
        ]
        if !addTypeIds.isEmpty { payload["addTypeIds"] = .sa(addTypeIds) }
        if userCompleted { payload["userCompleted"] = .b(true) }
        enqueue(.init(kind: .mastery, payload: payload))
    }

    /// 토픽 체크 — 로컬에 먼저 반영한 뒤 이 큐가 웹의 공식 진도 문서에 저장한다.
    func enqueueTopic(courseId: String, unitId: String, conceptId: String,
                      topicIndex: Int, completed: Bool) {
        enqueue(.init(kind: .topic, payload: [
            "courseId": .s(courseId), "unitId": .s(unitId),
            "conceptId": .s(conceptId), "topicIndex": .i(topicIndex),
            "completed": .b(completed),
        ]))
    }

    /// 학습 이벤트 — EventLog 와 같은 어휘(서버 enum 과 일치하는 것만 보낸다)
    func enqueueEvent(_ type: String, conceptId: String?, correct: Bool?, durationMs: Int?) {
        var p: [String: SyncValue] = ["eventType": .s(type), "clientEventId": .s(UUID().uuidString)]
        if let c = conceptId { p["conceptId"] = .s(c) }
        if let ok = correct { p["correct"] = .b(ok) }
        if let d = durationMs { p["durationMs"] = .i(d) }
        enqueue(.init(kind: .event, payload: p))
    }

    /// 보호 화면에서 발생한 캡처 신호를 일반 학습 KPI와 섞지 않고 같은 내구성 큐로
    /// 전송한다. 게스트는 로컬 EventLog에만 남고, 서버 계정은 오프라인이어도 계정별
    /// 큐에 보존되어 재로그인·네트워크 복구 뒤 올라간다. 화면 이름과 실행 코드는
    /// 여기서도 다시 정제해 계정명·이메일·경기 ID가 payload에 섞이지 않게 한다.
    func enqueueIntegrityEvent(_ type: String, sessionCode: String, surface: String) {
        guard let eventType = ScreenIntegrityEventContract.normalizedEventType(type) else { return }
        enqueue(.init(kind: .event, payload: [
            "eventType": .s(eventType),
            "clientEventId": .s(UUID().uuidString),
            "integritySessionCode": .s(
                ScreenIntegrityEventContract.normalizedSessionCode(sessionCode)),
            "protectedSurface": .s(
                ScreenIntegrityEventContract.normalizedSurface(surface)),
        ]))
    }

    /// 평가·기출의 여러 문항을 HTTP 한 번으로 올린다. 한 문항당 큐/요청 하나를
    /// 만들지 않으면서 서버 대시보드에는 일반 연습과 같은 정오 이벤트로 남긴다.
    func enqueueGradingEvents(correct: Int, total: Int, durationMs: Int? = nil) {
        let safeTotal = max(0, total)
        guard safeTotal > 0 else { return }
        var payload: [String: SyncValue] = [
            "correctCount": .i(min(max(0, correct), safeTotal)),
            "totalCount": .i(safeTotal),
        ]
        if let durationMs { payload["durationMs"] = .i(max(0, durationMs)) }
        enqueue(.init(kind: .gradingBatch, payload: payload))
    }

    /// 오답 적재 — 로컬 오답노트에 새로 들어온 항목
    func enqueueWrongNote(_ note: WrongNoteEntry) {
        enqueue(wrongNoteOp(note))
    }

    private func wrongNoteOp(_ note: WrongNoteEntry) -> SyncOp {
        var p: [String: SyncValue] = [
            "clientAttemptId": .s(note.id),
            "typeKey": .s(note.typeKey),
            "seed": .s(String(note.seed)),
            "statement": .s(note.statement),
            "answer": .s(note.answer),
            "steps": .sa(note.steps),
            "wrongCount": .i(note.wrongCount),
            "srsStage": .i(note.srsStage),
            "hasDrawing": .b(note.drawingPNGBase64 != nil),
            "createdAt": .s(ISO8601DateFormatter().string(from: note.createdAt)),
        ]
        // 선지와 KaTeX 플래그를 함께 올린다.
        // 이게 없으면 다른 기기에서 받은 5지선다가 choices=nil 로 복원돼
        // **주관식으로 둔갑**한다 — 11차에 로컬 경로에서 고쳤던 바로 그 증상이
        // 동기화 경로에만 그대로 남아 있었다(2026-07-29 감사 적발).
        if let c = note.choices, !c.isEmpty { p["choices"] = .sa(c) }
        if let t = note.isTex { p["isTex"] = .b(t) }
        if let m = note.myAnswer { p["myAnswer"] = .s(m) }
        if let d = note.divergenceStep { p["divergenceStep"] = .i(d) }
        if let e = note.errorType { p["errorType"] = .s(e) }
        if let n = note.nextReviewAt {
            p["nextReviewAt"] = .s(ISO8601DateFormatter().string(from: n))
        }
        return .init(kind: .wrongNote, payload: p)
    }

    /// 재오답을 서버에 알린다 — 서버 id 가 있으면 복습 결과로, 없으면 bulk 재전송으로.
    ///
    /// 왜 두 갈래인가: `enqueueReviewResult` 는 서버가 붙여 준 attemptId 가 있어야
    /// 주소를 만든다. 아직 bulk 가 안 올라간 새 오답은 그 id 가 없어서, 예전에는
    /// 재오답이 통째로 버려졌다(다음 복습부터나 반영). 이제 서버 bulk 가 같은
    /// clientAttemptId 를 중복으로 보되 wrongCount·srsStage·예정일은 갱신하므로
    /// (2026-07-29 서버 규약 수정) id 가 없을 때는 그쪽으로 우회한다.
    func enqueueWrongAgain(_ note: WrongNoteEntry) {
        if note.serverAttemptId != nil {
            enqueueReviewResult(note, correct: false)
        } else {
            enqueueWrongNote(note)
        }
    }

    /// 복습 결과 — SRS 단계가 전진/리셋된 사실을 서버에 올린다.
    /// 복습 화면에서 맞힌 경우처럼 "정답으로 졸업/전진" 은 이 엔드포인트만 표현할 수 있다
    /// (bulk 는 오답 적재용이라 correct 를 받지 않는다).
    func enqueueReviewResult(_ note: WrongNoteEntry, correct: Bool) {
        // 첫 bulk 응답을 받기 전에도 복습할 수 있다. 그 구간에는 서버 ObjectId가
        // 없으므로 clientAttemptId(UUID)를 주소로 쓰고, 서버가 둘 다 해석한다.
        // 예전 guard는 사용자에게 성공으로 보인 복습 결과를 조용히 버렸고,
        // 새 기기에서 같은 오답이 '미복습'으로 되감겼다.
        let attemptID = WrongNoteReviewSyncAddress.attemptIdentifier(for: note)
        var p: [String: SyncValue] = [
            "attemptId": .s(attemptID),
            "correct": .b(correct),
            "srsStage": .i(note.srsStage),
            "wrongCount": .i(note.wrongCount),
        ]
        if let n = note.nextReviewAt {
            p["nextReviewAt"] = .s(ISO8601DateFormatter().string(from: n))
        }
        enqueue(.init(kind: .reviewResult, payload: p))
    }

    func enqueueStuckPoint(_ point: StuckPointRecord) {
        enqueue(.init(id: point.id, kind: .stuckPoint, payload: [
            "id": .s(point.id),
            "text": .s(point.text),
            "createdAt": .s(ISO8601DateFormatter().string(from: point.createdAt)),
        ], createdAt: point.createdAt))
    }

    func enqueueProgressReset() {
        enqueue(.init(kind: .progressReset, payload: [:]))
    }

    private func enqueue(_ op: SyncOp) {
        // 게이트는 토큰이 아니라 **계정 정체성**이다 (S-02·B-09).
        // 토큰이 만료로 지워진 구간에도 서버 계정의 기록은 큐에 쌓여야 한다 —
        // 재로그인하면 flush 가 이어서 올린다. 로컬 우선 큐의 존재 이유가 이것이다.
        guard isServerAccountSlot else { return }   // 게스트는 큐에 쌓지 않는다
        syncSlotIfNeeded()                          // 계정이 바뀌었으면 여기서 갈아끼운다
        var op = op
        op.slot = loadedSlot                        // 누구 것인지 새겨 둔다
        queue.append(op)
        pending = queue.count
        if !Self.appendToDisk(op) {
            // op 는 메모리에 남아 이번 실행 안에서는 전송을 시도하고, 다음 flush 성공 시
            // rewrite 가 파일을 재구성해 자기 치유된다. 그 전에 앱이 죽으면 유실이므로
            // 성공한 척하지 않고 상태 UI 에 태운다 (X-04 — 저장 실패를 삼키지 않는다).
            lastError = "로컬 큐 저장 실패 — 저장 공간을 확인해 주세요"
        }
        Task { await flush() }
    }

    // MARK: 전송

    /// 큐를 앞에서부터 비운다. 실패는 3분류다 (B-09 — 독성 메시지 격리):
    ///  ① 일시 오류 — 401(만료)·URLError(네트워크)·5xx·408·429:
    ///     큐를 보존하고 그 자리에서 멈춘다(다음 기회에 재시도, 현행 유지).
    ///  ② 독성 오류 — 그 외 4xx(서버가 영구 거부: 잘못된 payload, 삭제된 conceptId 등):
    ///     op 별 attemptCount 를 올리고, 상한 초과 시 sync-deadletter.jsonl 로 격리한 뒤
    ///     다음 op 로 진행한다 — 독성 op 하나가 FIFO 맨 앞에서 뒤의 모든 진도·오답
    ///     전송을 영원히 막지 않게.
    ///  ③ 분류 불가(상태코드 없음) — 보수적으로 ① 취급한다. 기록 보존이 우선이다.
    func flush() async {
        guard !flushing, canReachServer else { return }
        syncSlotIfNeeded()          // 계정이 바뀌었으면 여기서 큐를 갈아끼운다
        guard !queue.isEmpty else { return }
        flushing = true
        defer { flushing = false }

        while let op = queue.first {
            // 앞 계정 op 를 뒷 계정 토큰으로 올리면 남의 기록이 된다 — 어긋나면 멈춘다
            guard belongsToCurrentAccount(op) else { return }
            do {
                try await send(op)
                // 응답을 기다리는 사이 로그아웃·계정 전환이 있었을 수 있다. 그러면
                // 큐를 건드리지 않고 물러난다(뒷 계정 슬롯 파일에 앞 계정 큐를 적지 않게).
                // 방금 보낸 그 op 가 여전히 맨 앞일 때만 지운다 — 큐가 갈아끼워졌는데
                // 앞에서부터 지우면 아직 보내지도 않은 남의 op 가 사라진다.
                // 이미 보낸 op 가 큐에 남더라도 모든 전송이 멱등이라 서버가 중복을 거른다.
                guard belongsToCurrentAccount(op), queue.first?.id == op.id else { return }
                queue.removeFirst()
                pending = queue.count
                Self.rewrite(queue)
                lastSyncedAt = Date()
                lastError = nil
            } catch {
                lastError = (error as? ServerAPIError)?.errorDescription ?? "\(error)"
                // 전송 성공 경로와 같은 이유로, 응답 대기 중 계정이 바뀌었으면
                // 큐를 건드리지 않는다.
                guard belongsToCurrentAccount(op), queue.first?.id == op.id else { return }
                // ①·③ — 401(재로그인 후 재개)·408·429·5xx·네트워크·미분류는 보존·중단.
                guard let status = (error as? ServerAPIError)?.statusCode,
                      (400..<500).contains(status),
                      status != 401, status != 408, status != 429 else { return }
                // ② — 독성 4xx. 횟수를 큐 파일에도 남겨 재시작 후에도 이어 센다.
                var poisoned = op
                let attempts = (op.attemptCount ?? 0) + 1
                poisoned.attemptCount = attempts
                if attempts > Self.maxToxicAttempts {
                    // 격리 = 큐에서 빼되 지우지 않는다. 학생 학습 기록의 마지막
                    // 사본일 수 있다 — 증거 보존 + 수동 재생 여지 (되돌리기 경로).
                    Self.appendDeadLetter(poisoned, statusCode: status)
                    deadLettered += 1
                    queue.removeFirst()
                    lastError = "서버가 거부한 기록 1건을 격리했습니다 (\(status))"
                } else {
                    queue[0] = poisoned
                }
                pending = queue.count
                Self.rewrite(queue)
                // 아직 격리 전이면 같은 op 가 맨 앞에 남아 있다 — 다음 기회에 재시도.
                // (연속 즉시 재시도는 서버만 두드린다. 60초 타이머가 간격을 만든다)
                if queue.first?.id == op.id { return }
            }
        }
    }

    private func send(_ op: SyncOp) async throws {
        switch op.kind {
        case .mastery:
            let course = str(op, "courseId"), unit = str(op, "unitId"), concept = str(op, "conceptId")
            let typeIDs: [String]
            if case .sa(let values)? = op.payload["addTypeIds"] {
                typeIDs = values
            } else {
                // 이 필드만 있던 구 큐 파일도 계속 보낸다.
                let legacyType = str(op, "typeKey")
                typeIDs = legacyType.isEmpty ? [] : [legacyType]
            }
            try await ServerAPI.patchMastery(courseId: course, unitId: unit, conceptId: concept,
                                             addTypeIds: typeIDs,
                                             userCompleted: bool(op, "userCompleted"))
        case .topic:
            try await ServerAPI.patchTopic(
                courseId: str(op, "courseId"),
                unitId: str(op, "unitId"),
                conceptId: str(op, "conceptId"),
                topicIndex: int(op, "topicIndex"),
                completed: bool(op, "completed"),
                clientEventId: op.id,
                occurredAt: op.createdAt)
        case .progressSnapshot:
            var topicIndexes: [Int] = []
            if case .ia(let values)? = op.payload["completedTopicIndexes"] {
                topicIndexes = values
            }
            var typeIDs: [String] = []
            if case .sa(let values)? = op.payload["correctTypeIds"] {
                typeIDs = values
            }
            try await ServerAPI.patchProgressSnapshot(
                courseId: str(op, "courseId"),
                unitId: str(op, "unitId"),
                conceptId: str(op, "conceptId"),
                completedTopicIndexes: topicIndexes,
                correctTypeIds: typeIDs,
                userCompleted: bool(op, "userCompleted"),
                lastStudiedAt: {
                    let value = str(op, "lastStudiedAt")
                    return value.isEmpty ? nil : value
                }())
        case .event:
            // 이벤트가 "언제 일어났는지" 를 아는 건 op.createdAt 뿐이다. 이걸 빼고 보내면
            // 서버가 수신 시각으로 대체해(ipadSyncController postEvents), 오프라인에 사흘치를
            // 쌓았다가 한 번에 올린 순간 전부 오늘 하루로 뭉친다 — 대시보드 주간 그래프는
            // 바로 이 occurredAt 으로 날짜를 가른다.
            var payload = op.payload.mapValues(\.any)
            payload["occurredAt"] = ISO8601DateFormatter().string(from: op.createdAt)
            try await ServerAPI.postEvents([payload])
        case .gradingBatch:
            let total = max(0, int(op, "totalCount"))
            let correct = min(max(0, int(op, "correctCount")), total)
            guard total > 0 else { return }
            let duration: Int? = op.payload["durationMs"].map { value in
                if case .i(let milliseconds) = value { return milliseconds }
                return 0
            }
            let perItem = (duration ?? 0) / total
            let remainder = (duration ?? 0) % total
            let occurredAt = ISO8601DateFormatter().string(from: op.createdAt)
            let events: [[String: Any]] = (0..<total).map { index in
                let isCorrect = index < correct
                var event: [String: Any] = [
                    "clientEventId": "\(op.id)-\(index)",
                    "eventType": isCorrect ? "problem-correct" : "problem-wrong",
                    "correct": isCorrect,
                    "occurredAt": occurredAt,
                ]
                if duration != nil {
                    event["durationMs"] = perItem + (index < remainder ? 1 : 0)
                }
                return event
            }
            try await ServerAPI.postEvents(events)
        case .wrongNote:
            let map = try await ServerAPI.postWrongNotes([op.payload.mapValues(\.any)])
            // 서버가 붙인 id 를 오답노트에 적어 둔다 — 복습 결과는 이 값으로만 올릴 수 있다
            if let client = op.payload["clientAttemptId"], case .s(let cid) = client,
               let sid = map[cid] {
                onServerID?(cid, sid)
            }
        case .reviewResult:
            var correct = true
            if case .b(let v)? = op.payload["correct"] { correct = v }
            try await ServerAPI.postReviewResult(attemptId: str(op, "attemptId"),
                                                 correct: correct,
                                                 srsStage: int(op, "srsStage"),
                                                 wrongCount: int(op, "wrongCount"),
                                                 nextReviewAt: op.payload["nextReviewAt"].map { "\($0.any)" },
                                                 clientEventId: op.id)
        case .stuckPoint:
            try await ServerAPI.postStuckPoint(
                id: str(op, "id"),
                text: str(op, "text"),
                createdAt: str(op, "createdAt"))
        case .progressReset:
            try await ServerAPI.resetLearningProgress(
                clientResetId: op.id,
                occurredAt: ISO8601DateFormatter().string(from: op.createdAt))
        }
    }

    private func str(_ op: SyncOp, _ k: String) -> String {
        if case .s(let v)? = op.payload[k] { return v }
        return ""
    }
    private func int(_ op: SyncOp, _ k: String) -> Int {
        if case .i(let v)? = op.payload[k] { return v }
        return 0
    }
    private func bool(_ op: SyncOp, _ k: String) -> Bool {
        if case .b(let v)? = op.payload[k] { return v }
        return false
    }

    // MARK: 로그인 직후 초기 동기화

    /// 서버 계정으로 들어온 순간: 로컬에 있던 것을 한 번 밀어 올리고, 반대로
    /// 다른 기기에서 쌓인 것을 내려받는다. 한쪽만 하면 기기를 바꾼 사람의 오답노트가
    /// 비어 보인다(밀어 올리기만 하던 것이 감사에서 적발된 지점).
    func uploadLocalSnapshot(wrongNotes: [WrongNoteEntry],
                             progress: ProgressV2Store? = nil) {
        // 정체성 게이트 — 로그인 직후 토큰 저장이 어긋나는 드문 경합에도
        // 큐에는 쌓인다(전송은 flush 가 토큰 확보 후 이어서 한다).
        guard isServerAccountSlot else { return }
        var operations: [SyncOp] = []
        operations.reserveCapacity(wrongNotes.prefix(100).count + (progress?.byConcept.count ?? 0))
        for note in wrongNotes.prefix(100) {
            operations.append(wrongNoteOp(note))
        }
        if let progress {
            for conceptID in progress.byConcept.keys.sorted() {
                guard let local = progress.byConcept[conceptID],
                      let (course, unit, concept) = CurriculumV2.concept(conceptID) else { continue }
                let validTopics = local.completedTopicIndexes.sorted()
                    .filter { concept.topics.indices.contains($0) }
                guard !validTopics.isEmpty || !local.correctTypeIds.isEmpty ||
                        local.userCompleted else { continue }
                var payload: [String: SyncValue] = [
                    "courseId": .s(course.id),
                    "unitId": .s(unit.id),
                    "conceptId": .s(concept.id),
                    "completedTopicIndexes": .ia(validTopics),
                    "correctTypeIds": .sa(local.correctTypeIds.sorted()),
                    "userCompleted": .b(local.userCompleted),
                ]
                if let date = local.lastStudiedAt {
                    payload["lastStudiedAt"] = .s(ISO8601DateFormatter().string(from: date))
                }
                operations.append(.init(kind: .progressSnapshot, payload: payload))
            }
        }
        enqueueBatch(operations)
        Task { await syncNow() }
    }

    /// 로그인 승계는 여러 건을 한 번에 큐에 넣고 파일도 한 번만 쓴다.
    /// 각 항목마다 flush Task 를 만들면 pull 이 업로드보다 먼저 달릴 수 있다.
    private func enqueueBatch(_ operations: [SyncOp]) {
        guard isServerAccountSlot, !operations.isEmpty else { return }   // enqueue 와 같은 게이트
        syncSlotIfNeeded()
        let stamped = operations.map { source -> SyncOp in
            var op = source
            op.slot = loadedSlot
            return op
        }
        queue.append(contentsOf: stamped)
        pending = queue.count
        Self.rewrite(queue)
    }

    // MARK: 서버 → 로컬 (pull)

    /// 증분 pull — 마지막으로 받은 시각 이후에 서버에 쌓인 오답만 가져온다.
    /// 합치는 일은 AppStore(onRemoteWrongNotes)가 한다. 같은 id 는 그쪽에서 걸러진다.
    func pullWrongNotes() async {
        // 받아 줄 곳이 없으면 요청 자체를 하지 않는다 — 커서만 밀어 두면
        // 수신부가 붙는 날 그 구간 오답을 영영 못 받는다.
        guard let handler = onRemoteWrongNotes else { return }
        // canReachServer: 재설치 후 게스트 슬롯 + 잔존 토큰으로 이전 계정의 오답을
        // 게스트 슬롯에 내려받는 경로를 막는다 (S-02).
        guard canReachServer, !pulling else { return }
        // 깨우기 경로가 여럿이라 간격을 둔다(계정이 바뀌면 syncSlotIfNeeded 가 풀어 준다)
        if let last = lastPullAt, Date().timeIntervalSince(last) < 300 { return }
        pulling = true
        defer { pulling = false }
        lastPullAt = Date()         // 실패해도 간격을 지킨다(깨우기마다 두드리지 않게)

        let slot = DataScope.slot
        let since = UserDefaults.standard.string(forKey: Self.pullCursorKey)
        do {
            let rows = try await ServerAPI.getWrongNotes(since: since)
            // 응답을 기다리는 사이 계정이 바뀌었으면 남의 계정 오답을 붓지 않는다
            guard slot == DataScope.slot else { return }
            let notes = rows.compactMap { Self.entry(from: $0) }
            if !notes.isEmpty { handler(notes) }
            // 커서는 "받은 것 중 가장 최근" 으로 잡는다 — 기기·서버 시계 차이를 타지 않고,
            // 초 이하가 잘려 같은 항목을 한 번 더 받아도 병합에서 걸러지므로 안전한 쪽이다.
            if let newest = rows.compactMap({ Self.date(from: $0.updatedAt) }).max() {
                UserDefaults.standard.set(ISO8601DateFormatter().string(from: newest),
                                          forKey: Self.pullCursorKey)
            }
            lastSyncedAt = Date()
            lastError = nil
        } catch {
            lastError = (error as? ServerAPIError)?.errorDescription ?? "\(error)"
        }
    }

    /// 서버 행 → 로컬 오답 항목. 서버는 단원명·필기·선지를 보관하지 않으므로
    /// 그 자리는 비워 둔다(없는 것을 지어내지 않는다).
    private static func entry(from r: ServerAPI.RemoteWrongNote) -> WrongNoteEntry? {
        guard !r.statement.isEmpty else { return nil }
        let type = r.typeKey ?? "unknown"
        return WrongNoteEntry(
            // 이 기기에서 만든 오답이면 clientAttemptId 가 로컬 id 와 같은 값이라
            // 병합에서 자기 자신과 겹쳐 중복이 생기지 않는다.
            id: r.clientAttemptId ?? r.attemptId,
            problemID: r.attemptId,
            typeKey: type,
            typeName: type,
            unit: "",
            statement: r.statement,
            answer: r.answer ?? "",
            steps: r.steps ?? [],
            seed: UInt64(r.seed ?? "") ?? 0,
            divergenceStep: r.divergenceStep,
            drawingPNGBase64: nil,
            srsStage: r.srsStage ?? 0,
            // 서버 상태를 그대로 해석한다.
            //   completed → nil (복습 완료)
            //   scheduled → 예약 시각
            //   pending   → **오늘** (아직 한 번도 복습하지 않았다)
            // 예전엔 nextReviewAt 만 보고 매핑해서, pending 이 nil 로 들어와
            // '복습 완료'가 되고 다시는 출제되지 않았다.
            nextReviewAt: {
                switch r.reviewStatus ?? "pending" {
                case "completed": return nil
                case "scheduled": return date(from: r.nextReviewAt) ?? Date()
                default:          return date(from: r.nextReviewAt) ?? Date()
                }
            }(),
            wrongCount: r.wrongCount ?? 1,
            createdAt: date(from: r.createdAt) ?? Date(),
            // 선지·KaTeX 플래그 복원 — 없으면 복습 때 주관식으로 둔갑한다
            choices: r.choices.flatMap { $0.isEmpty ? nil : $0 },
            isTex: r.isTex,
            errorType: r.errorType,
            myAnswer: r.myAnswer,
            serverAttemptId: r.attemptId,
            serverUpdatedAt: date(from: r.updatedAt) ?? date(from: r.createdAt)
        )
    }

    /// 서버 날짜는 밀리초가 붙어 오기도 한다 — 둘 다 받아 준다.
    private static func date(from s: String?) -> Date? {
        guard let s, !s.isEmpty else { return nil }
        let withMillis = ISO8601DateFormatter()
        withMillis.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withMillis.date(from: s) ?? ISO8601DateFormatter().date(from: s)
    }

    // MARK: 디스크 (append-only JSONL)

    /// 디코딩 실패 줄은 조용히 버리지 않는다 — 학생 학습 기록(진도·오답·복습 결과)의
    /// 마지막 사본일 수 있다. 원문을 sync-queue.quarantine.jsonl 에 그대로 보존하고
    /// 몇 줄이었는지 센다(호출부가 lastError 로 표면화한다). 이전에는 try? 로
    /// 무음 폐기했다 — 주석 스스로 "디코딩 실패 = 유실" 이라 적어 놓고 방치했던 지점.
    private static func loadQueue() -> (ops: [SyncOp], quarantined: Int) {
        loadQueue(at: queueURL, quarantineURL: DataScope.url("sync-queue.quarantine.jsonl"))
    }

    /// 제품 큐와 실기 자가진단이 같은 decoder를 사용한다. 자가진단이 별도 구현이면
    /// 테스트만 통과하고 실제 앱 재시작 복원은 깨지는 false-green이 생긴다.
    private static func loadQueue(
        at url: URL,
        quarantineURL: URL?
    ) -> (ops: [SyncOp], quarantined: Int) {
        guard let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .utf8) else { return ([], 0) }
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        var ops: [SyncOp] = []
        var badLines: [Substring] = []
        for line in text.split(separator: "\n") {
            if let d = line.data(using: .utf8), let op = try? dec.decode(SyncOp.self, from: d) {
                ops.append(op)
            } else {
                badLines.append(line)
            }
        }
        if !badLines.isEmpty, let quarantineURL {
            appendRawLines(badLines.map(String.init),
                           to: quarantineURL)
        }
        return (ops, badLines.count)
    }

    /// 쓰기 실패를 알린다 — 실패했는데 pending 만 올라가면 "서버에 올라갈 예정" 이라는
    /// 화면의 약속이 거짓이 된다. 호출부가 false 를 받으면 lastError 로 표면화한다.
    private static func appendToDisk(_ op: SyncOp) -> Bool {
        appendToDisk(op, at: queueURL)
    }

    private static func appendToDisk(_ op: SyncOp, at url: URL) -> Bool {
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        guard let line = try? enc.encode(op), var text = String(data: line, encoding: .utf8) else { return false }
        text += "\n"
        if let handle = try? FileHandle(forWritingTo: url) {
            defer { try? handle.close() }
            do {
                try handle.seekToEnd()
                try handle.write(contentsOf: Data(text.utf8))
                return true
            } catch { return false }
        } else {
            return (try? Data(text.utf8).write(to: url)) != nil
        }
    }

    // MARK: deadletter (독성 op 격리 — 슬롯 파일 옆)

    /// 격리 파일. 큐에서 뺀 op 를 지우지 않고 여기 남긴다 — 서버 규약이 고쳐지면
    /// 이 파일에서 op 를 꺼내 다시 큐에 태울 수 있다(되돌리기 경로).
    private static var deadLetterURL: URL { DataScope.url("sync-deadletter.jsonl") }

    /// 격리 기록 — 왜(statusCode)·언제(quarantinedAt) 격리됐는지를 op 와 함께 남긴다.
    /// 상태코드 없이 op 만 남기면 나중에 "왜 여기 있는지" 를 설명할 수 없다.
    private struct DeadLetterRecord: Codable {
        var statusCode: Int
        var quarantinedAt: Date
        var op: SyncOp
    }

    private static func appendDeadLetter(_ op: SyncOp, statusCode: Int) {
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        let record = DeadLetterRecord(statusCode: statusCode, quarantinedAt: Date(), op: op)
        guard let line = try? enc.encode(record),
              let text = String(data: line, encoding: .utf8) else { return }
        appendRawLines([text], to: deadLetterURL)
    }

    private static func deadLetterCount() -> Int {
        guard let data = try? Data(contentsOf: deadLetterURL),
              let text = String(data: data, encoding: .utf8) else { return 0 }
        return text.split(separator: "\n").count
    }

    /// 원문 줄 append 공용부 (격리·deadletter). 여기서의 쓰기 실패는 더 물러날 곳이
    /// 없다(격리 자체가 최후 보존 수단) — 최소한 시스템 로그에는 증거를 남긴다.
    private static func appendRawLines(_ lines: [String], to url: URL) {
        let blob = lines.joined(separator: "\n") + "\n"
        if let handle = try? FileHandle(forWritingTo: url) {
            defer { try? handle.close() }
            do {
                try handle.seekToEnd()
                try handle.write(contentsOf: Data(blob.utf8))
            } catch {
                NSLog("SYNC-QUARANTINE-ERROR 격리 파일 쓰기 실패: %@", url.lastPathComponent)
            }
        } else if (try? Data(blob.utf8).write(to: url)) == nil {
            NSLog("SYNC-QUARANTINE-ERROR 격리 파일 생성 실패: %@", url.lastPathComponent)
        }
    }

    private static func rewrite(_ ops: [SyncOp]) {
        rewrite(ops, at: queueURL)
    }

    private static func rewrite(_ ops: [SyncOp], at url: URL) {
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        let text = ops.compactMap { try? enc.encode($0) }
            .compactMap { String(data: $0, encoding: .utf8) }
            .joined(separator: "\n")
        try? Data((text.isEmpty ? "" : text + "\n").utf8).write(to: url)
    }

    #if DEBUG
    struct IntegrityQueueDeviceQAResult {
        let persisted: Bool
        let reloaded: Bool
        let payloadPreserved: Bool
        let cleared: Bool
    }

    /// 네트워크를 끈 상태의 핵심 계약(append→앱 재시작 reload→성공 뒤 rewrite)을
    /// 제품과 같은 JSONL codec으로 실행한다. 실제 계정 슬롯 파일 대신 전달받은 전용
    /// 파일만 사용하며 종료 전에 삭제한다.
    static func runIntegrityQueueDeviceQA(at url: URL) -> IntegrityQueueDeviceQAResult {
        try? FileManager.default.removeItem(at: url)
        let op = SyncOp(
            id: "screen-integrity-device-qa",
            kind: .event,
            payload: [
                "eventType": .s("protected-screen-screenshot"),
                "clientEventId": .s("screen-integrity-device-qa"),
                "integritySessionCode": .s("QA123456"),
                "protectedSurface": .s("placement-exam"),
            ],
            createdAt: Date(timeIntervalSince1970: 1_786_420_800),
            slot: "acct-device-qa",
            attemptCount: nil
        )
        let persisted = appendToDisk(op, at: url)
        let loaded = loadQueue(at: url, quarantineURL: nil)
        let restored = loaded.ops.first
        let reloaded = loaded.ops.count == 1
            && loaded.quarantined == 0
            && restored?.id == op.id
            && restored?.slot == op.slot
        let payloadPreserved: Bool = {
            guard case .s(let type)? = restored?.payload["eventType"],
                  case .s(let code)? = restored?.payload["integritySessionCode"],
                  case .s(let surface)? = restored?.payload["protectedSurface"] else {
                return false
            }
            return type == "protected-screen-screenshot"
                && code == "QA123456"
                && surface == "placement-exam"
        }()
        rewrite([], at: url)
        let cleared = loadQueue(at: url, quarantineURL: nil).ops.isEmpty
            && (try? Data(contentsOf: url).isEmpty) == true
        try? FileManager.default.removeItem(at: url)
        return IntegrityQueueDeviceQAResult(
            persisted: persisted,
            reloaded: reloaded,
            payloadPreserved: payloadPreserved,
            cleared: cleared
        )
    }
    #endif
}
