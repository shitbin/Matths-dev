//  MatthsApp.swift
//  Matths — iPadOS 앱 진입점

import SwiftUI
import UserNotifications
import UIKit

struct StuckPointRecord: Codable, Identifiable, Equatable {
    var id: String
    var text: String
    var createdAt: Date

    init(id: String = UUID().uuidString, text: String, createdAt: Date = Date()) {
        self.id = id
        self.text = text
        self.createdAt = createdAt
    }
}

@MainActor
final class MatthsAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        handleEventsForBackgroundURLSession identifier: String,
        completionHandler: @escaping () -> Void
    ) {
        ResumableModelDownload.shared.acceptBackgroundEvents(
            identifier: identifier,
            completion: completionHandler)
    }
}

@main
struct MatthsApp: App {
    @UIApplicationDelegateAdaptor(MatthsAppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var screenshotGuard = ScreenshotGuard()
    @StateObject private var store = AppStore()

    init() {
        // 저장소가 파일을 읽기 **전에** 옛 평평한 파일을 현재 슬롯으로 옮긴다.
        // (AppStore 의 @Published 들이 init 에서 디스크를 읽으므로 순서가 중요하다)
        DataScope.migrateLegacyIfNeeded()
        LocalAIBackgroundExecution.cleanupStaleSourcePhotos()
        // 지난 실행이 비전 프로젝터를 여는 도중 죽었으면(ggml_abort 는 못 잡는다)
        // 그 모델의 비전을 끄고 다시 뜬다. 부팅 루프 없이 한 번만 아프고 끝난다.
        if let died = ModelDownloader.recoverFromVisionCrashIfNeeded() {
            AITutor.visionDisabledNotice = died
        }
        #if DEBUG
        // 자가진단 도중 jetsam/강제 종료가 나도 실험 티어가 사용자 설정으로 남지 않는다.
        VisionSelfTest.restoreForcedTierIfNeeded()
        // 실행 인자로 부른 비전 자가진단 — 평소 실행에는 아무 영향이 없다.
        // (사람이 앱을 열고 사진을 고르지 않아도 기기에서 숫자를 잴 수 있어야 한다)
        VisionSelfTest.runIfRequested()
        ScreenProtectionSelfTest.runIfRequested()
        AccessibilityDeviceSelfTest.runIfRequested()
        ModelDownloadSelfTest.runIfRequested()
        LocalAIRecoverySelfTest.runIfRequested()
        LocalAIBackgroundSelfTest.startIfRequested()
        #endif
    }

    var body: some Scene {
        WindowGroup {
            rootContent
                // 프로필의 테마 설정 (시스템/라이트/다크)
                .preferredColorScheme(store.themePreference == "light" ? .light
                                      : store.themePreference == "dark" ? .dark : nil)
                .environmentObject(store)
                .environmentObject(screenshotGuard)
                .tint(Tokens.primary)
                .overlay {
                    RankPromotionPipelinePrewarmView()
                }
                // 승급 장식은 별도 화면 흐름이 아니라 현재 결과 위를 잠깐 덮는 표현
                // 계층이다. 별도 UIKit modal 전환을 만들지 않고 같은 scene의 최상단
                // overlay로 렌더해 전환 비용을 줄이고, 앱 전환 privacy cover도 이
                // 장식 위를 확실히 덮게 한다.
                .overlay {
                    RankPromotionOverlay(
                        tierCode: store.rankPromotionPresentation?.tierCode)
                        .environmentObject(store)
                }
                // 공통 보호 레이어는 루트와 fullScreenCover가 같은 구현을 쓴다.
                // 모달은 루트 overlay보다 위에 뜨므로 각 presentation 최상단에도
                // 붙여야 앱 전환 덮개·워터마크·캡처 안내가 경기 화면을 실제로 덮는다.
                .screenProtectionLayer(guardModel: screenshotGuard) { stuckPoint in
                    store.recordStuckPoint(stuckPoint)
                }
                .onChange(of: scenePhase) { _, phase in
                    screenshotGuard.setSceneActive(phase == .active)
                    if phase == .background {
                        LocalAIBackgroundExecution.shared.didEnterBackground()
                        #if DEBUG
                        LocalAIBackgroundSelfTest.recordBackgroundIfRequested()
                        #endif
                    } else if phase == .active {
                        LocalAIBackgroundExecution.shared.didBecomeActive()
                        GoatArenaClientReviewOutbox.recoverCompleted(store.cheatingReviews)
                        Task {
                            await store.refreshNotificationAuthorization()
                            await GoatArenaClientReviewOutbox.flush()
                        }
                    }
                }
                .task {
                    // 앱을 다시 연 직후에도 이전 실행의 완료 결과를 복구·전송한다.
                    // scenePhase가 이미 active면 onChange가 호출되지 않을 수 있다.
                    GoatArenaClientReviewOutbox.recoverCompleted(store.cheatingReviews)
                    await GoatArenaClientReviewOutbox.flush()
                }
                .onChange(of: store.isSessionMode, initial: true) { _, protected in
                    screenshotGuard.setBaseProtection(protected)
                }
                // ▼▼▼ 전역 디버그 바 — 이 묶음 하나만 주석 처리하면 통째로 사라진다 ▼▼▼
                // (주의: 오버레이는 체인 위쪽에 있어 .environmentObject 가 흐르지 않는다.
                //  명시 주입 없이는 EnvironmentObject.error() 로 즉사한다 — 실제로 한 번 죽었다.)
                #if DEBUG
                .overlay(alignment: .bottomTrailing) {
                    DebugBar().environmentObject(store)
                }
                .task {
                    await RankPromotionPerformanceSelfTest.runIfRequested(store: store)
                }
                #endif
                // ▲▲▲ 전역 디버그 바 끝 ▲▲▲
        }
    }

    @State private var splashDone = false

    /// 평소에는 스플래시 → RootView. DEBUG 에서 `-harness 320x1000-compact` 를 주면 폭 하네스.
    @ViewBuilder private var rootContent: some View {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-windowEnvironmentSelfTest") {
            WindowEnvironmentSelfTestView()
        } else if ProcessInfo.processInfo.arguments.contains("-authCapture") {
            AuthScreen()
        } else if let harness = MatthsApp.harnessFromArguments() {
            harness
        } else {
            splashThenRoot
        }
        #else
        splashThenRoot
        #endif
    }

    /// 스플래시는 실제 초기화와 연동할 비동기 신호가 없다(AppStore 부트는 init 의
    /// 동기 디스크 읽기로 끝난다). 그래서 SplashView 가 총 0.8초 상한을 스스로 지키고,
    /// 동작 줄이기/모션 꺼짐은 0.25초 크로스페이드로 즉시 걷힌다 (1754).
    @ViewBuilder private var splashThenRoot: some View {
        ZStack {
            // 로그인 전에는 인증 화면. DEBUG 자동화 인자(-route/-exam)는 게스트로 통과.
            if store.authProvider == nil {
                AuthScreen()
            } else {
                RootView()
            }
            if !splashDone && !MatthsApp.skipSplash {
                SplashView { splashDone = true }
            }
        }
    }

    /// 스크린샷용 `-route` 직행 실행에서는 스플래시가 방해가 되므로 건너뛴다.
    private static var skipSplash: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-route")
        #else
        false
        #endif
    }

    #if DEBUG
    private static func harnessFromArguments() -> SizeHarness? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-harness"), i + 1 < args.count else { return nil }
        return SizeHarness.parse(args[i + 1])
    }
    #endif
}

/// 앱 전역 상태의 단일 소유자 — 계정 슬롯(DataScope)·실계정 세션·학습 세션·진도·
/// 오답노트·동기화 콜백(SyncEngine)을 지휘한다. 폐기 가능한 목업이 아니다:
/// 여기의 순서·게이트 하나가 학생 기록의 보존/유실을 가른다 (init·signInServer 주석 참조).
@MainActor
final class AppStore: ObservableObject {
    private var authenticationExpiredObserver: NSObjectProtocol?

    @Published var route: Route = .home {
        // 전환 방향 — 탭 순서에서 앞으로 가면 +1(오른쪽에서 진입), 뒤로 가면 -1.
        // didSet 은 뷰 갱신 전에 돌므로 트랜지션이 항상 올바른 방향을 읽는다.
        didSet { navDirection = route.navOrder >= oldValue.navOrder ? 1 : -1 }
    }
    /// 마지막 라우트 전환의 방향 (±1). route 가 이미 @Published 라 별도 publish 불필요.
    var navDirection: CGFloat = 1
    @Published var lastGrading: GradingResult?

    // MARK: 온디바이스 풀이 무결성 검토

    /// 계정 슬롯 안의 관리자/개발자 검토 자료. 채점·랭킹·정산에는 사용하지 않는다.
    @Published private(set) var cheatingReviews: [CheatingReviewRecord] =
        CheatingReviewDisk.loadRecoveringInterrupted()
    private var cheatingReviewFlags: [UUID: CheatingDetectionCancelFlag] = [:]
    private var cheatingReviewTasks: [UUID: Task<Void, Never>] = [:]
    /// LlamaEngine 내부 호출은 직렬이지만 모델 전환까지 하나의 작업으로 묶어야 한다.
    /// 풀이를 연달아 제출해도 VLM unload/load가 서로 끼어들지 않게 검토 전체를 한 줄로 세운다.
    private var cheatingReviewQueueTail: Task<Void, Never>?

    // MARK: 오답노트 — 실데이터 (WrongNoteStore.swift)

    @Published var wrongNotes: [WrongNoteEntry] = WrongNoteDisk.load() {
        // 복습 예정일이 바뀌면 예약된 알림도 같이 바뀌어야 한다 —
        // 프로필이 약속한 "복습 예정 문항이 있는 날 저녁" 의 진실원은 이 목록이다.
        didSet { if reviewReminderOn { ReviewReminder.reschedule(wrongNotes) } }
    }

    /// 오늘 복습해야 하는 오답 수 — 하드코딩이 아니라 실제 목록에서 센다
    var dueReviewCount: Int { wrongNotes.filter(\.isDue).count }

    /// 복습 모드일 때, exam 인덱스 → 오답노트 항목 id
    var reviewingNoteIDs: [String]?

    /// 복습 세트를 잠시 접어 두는 자리 — "같은 유형 새 수치" 확인 문항 1개를 푸는 동안
    /// 보관했다가, 끝나면 그대로 펴서 이어 푼다. 이게 없으면 확인 문항이 startExam 을
    /// 타면서 진행 중이던 복습 큐를 통째로 파기했다 (2026-07-29 감사 적발).
    private struct PendingReview {
        let exam: [GeneratedProblem]
        let index: Int
        let noteIDs: [String]
        let results: [Bool]
        let startedAt: Date?
        let seed: UInt64
    }
    private var pendingReview: PendingReview?

    /// 지금 푸는 것이 "기록 없는 확인 문항" 인지.
    /// 참이면 통계·학습 이벤트·오답노트·최고 기록 어디에도 흔적을 남기지 않는다.
    private(set) var isVariationCheck = false

    // MARK: 학습일 — 연속 학습·주간 활동 (실데이터)

    @Published var activityDays: Set<String> = ActivityLog.load()
    /// 연속 학습 일수.
    ///
    /// **서버 계정이면 서버 값이 진실원이다.** 앱이 로컬 날짜 집합에서 따로 세면
    /// 기기 시간대·앱 미실행 구간 때문에 웹과 다른 숫자가 나온다
    /// (같은 학생이 웹에서는 7일, 앱에서는 4일). 게스트만 로컬 계산을 쓴다.
    var streakDays: Int {
        if authProvider == "server", let s = serverStreak { return s }
        return ActivityLog.streak(from: activityDays)
    }

    /// 서버가 내려준 스트릭. 로그인 때 채우고 슬롯에 저장해 재실행 후에도 유지한다
    /// (한 번만 세팅하면 앱을 껐다 켰을 때 로컬값으로 되돌아간다).
    @Published var serverStreak: Int? = AppStore.restoreStreak("matths.serverStreak") {
        didSet { AppStore.persistStreak(serverStreak, "matths.serverStreak") }
    }
    @Published var serverLongestStreak: Int? = AppStore.restoreStreak("matths.serverLongestStreak") {
        didSet { AppStore.persistStreak(serverLongestStreak, "matths.serverLongestStreak") }
    }

    /// -1 을 "없음" 으로 쓴다 — integer(forKey:) 는 키가 없을 때 0 을 주므로
    /// 0 을 nil 로 읽으면 "스트릭 0일" 과 구분이 안 된다.
    nonisolated static func restoreStreak(_ base: String) -> Int? {
        let v = UserDefaults.standard.object(forKey: slotKey(base)) as? Int
        return (v ?? -1) >= 0 ? v : nil
    }
    nonisolated static func persistStreak(_ value: Int?, _ base: String) {
        UserDefaults.standard.set(value ?? -1, forKey: slotKey(base))
    }

    // MARK: 시험 기록 — 랭킹 "내 기록" 의 근거

    @Published var examResults: [Bool] = []
    var examStartedAt: Date?
    /// 현재 문항 풀이 시작 시각 — 문항별 durationMs (학습 이벤트용)
    var solveStartedAt: Date?
    @Published var bestScore: Int = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.bestScore"))
    @Published var bestElapsedMs: Int = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.bestMs"))

    /// 스크린샷 감지 시 학생이 적은 "막힌 지점".
    /// 잔소리로 끝내지 않고 오답노트로 넘긴다 — 기능이 되게.
    /// 슬롯 파일(stuck-points.json)로 영속한다 — 메모리에만 두면 앱 종료로
    /// 학생이 직접 적은 기록이 증발하는데 화면에는 목록으로 남아 "저장됐다" 는
    /// 인상을 준다 (M-08 감사 적발: 조용한 데이터 유실).
    @Published var stuckPoints: [StuckPointRecord] = StuckPointsDisk.load()

    /// 오답노트 디스크 저장 실패·손상 복구를 사용자에게 알릴 한 줄 경고 문구.
    /// nil = 표시할 경고 없음. WrongNoteStore 쪽(WrongNoteDisk 저장/복구 경로)이
    /// 세팅하고, 표시는 Screens(오답노트 화면)가 한다 — 저장 실패를 삼키면
    /// "적재됐다" 고 보이고 재실행하면 사라지는 조용한 유실이 된다 (F-04).
    /// 닫기(배너 X)는 UI 가 nil 로 되돌린다.
    @Published var wrongNoteStorageAlert: String?

    enum Route: Hashable, CaseIterable {
        case home, curriculum, concept, solve, result, assess, weeklyMock, wrongNotes, rank, arenaShop, placement, pro, profile, kice, paper, chat, quickPractice
    }

    /// 서버가 확정한 실제 티어 공개 이벤트만 재생한다. 현재 티어를 단순 조회했다고
    /// 애니메이션을 반복하지 않도록 결정적 presentation id를 계정별로 기록한다.
    struct RankPromotionPresentation: Identifiable, Equatable {
        let id: String
        let tierCode: String
    }

    @Published var rankPromotionPresentation: RankPromotionPresentation?

    func presentRankPromotion(tierCode: String, presentationId: String) {
        guard let tier = RankTier(serverCode: tierCode),
              !presentationId.isEmpty else { return }

        let seenKey = AppStore.slotKey("matths.rankPromotion.seen")
        var seen = Set(UserDefaults.standard.stringArray(forKey: seenKey) ?? [])
        guard !seen.contains(presentationId) else { return }
        seen.insert(presentationId)
        UserDefaults.standard.set(Array(seen.suffix(64)), forKey: seenKey)
        UserDefaults.standard.set(
            tierCode.uppercased(),
            forKey: AppStore.slotKey("matths.rankPromotion.lastTier"))
        let presentation = RankPromotionPresentation(
            id: presentationId,
            tierCode: tierCode.uppercased())
        // 화면을 먼저 띄운 뒤 PNG와 음원을 준비하면 조립 모션이 시작되는 순간 끊긴다.
        // 결과 화면은 유지한 채 현재 티어 리소스를 백그라운드에서 준비하고 cover를 연다.
        RankBadgeAssets.prewarmPromotion(tier: tier) { [weak self] in
            guard let self else { return }
            self.rankPromotionPresentation = presentation
        }
    }

    /// GOAT Arena를 새로고침할 때 실제 승급만 포착한다. 첫 조회는 기준점을 저장할
    /// 뿐 재생하지 않고, 배치 결과 공개는 서버 presentation id 경로가 담당한다.
    func observeArenaTier(_ tierCode: String?) {
        guard let newTier = RankTier(serverCode: tierCode) else { return }
        let key = AppStore.slotKey("matths.rankPromotion.lastTier")
        guard let oldCode = UserDefaults.standard.string(forKey: key),
              let oldTier = RankTier(serverCode: oldCode) else {
            UserDefaults.standard.set(newTier.rawValue, forKey: key)
            return
        }
        UserDefaults.standard.set(newTier.rawValue, forKey: key)
        guard let oldIndex = RankTier.allCases.firstIndex(of: oldTier),
              let newIndex = RankTier.allCases.firstIndex(of: newTier),
              newIndex > oldIndex else { return }
        presentRankPromotion(
            tierCode: newTier.rawValue,
            presentationId: "arena-tier:\(oldTier.rawValue):\(newTier.rawValue)")
    }

    func dismissRankPromotion() {
        rankPromotionPresentation = nil
    }

    // MARK: AI 튜터 (온디바이스 Qwen3.5 — LocalLLM.swift)

    /// 채팅 진입 시 미리 깔아 둘 문제 맥락 (오답노트/결과 화면의 "AI에게 묻기")
    @Published var chatSeedContext: String?

    /// 마지막 제출 답 원문 — 결과 화면에서 AI 튜터 맥락으로 넘긴다
    var lastStudentInput: String?

    /// 오답노트 "AI에게 묻기" — 문제·내 답·정답을 맥락으로 채팅 진입
    func openChatAbout(problem statement: String, myAnswer: String?, correct: String?) {
        var ctx = "문제: \(statement)"
        if let m = myAnswer, !m.isEmpty { ctx += "\n내가 낸 답: \(m)" }
        if let c = correct, !c.isEmpty { ctx += "\n정답: \(c)" }
        chatSeedContext = ctx
        route = .chat
    }

    // MARK: 프로필 — 설정과 학습 통계

    /// 학년 (10=고1, 11=고2, 12=고3, 13=N수)
    @Published var schoolGrade: Int =
        UserDefaults.standard.object(forKey: AppStore.slotKey("matths.grade")) as? Int ?? 12 {
        didSet {
            UserDefaults.standard.set(schoolGrade, forKey: AppStore.slotKey("matths.grade"))
        }
    }

    /// 학교 (경쟁전 리그 기반) — 목록 검증을 거친 값만 저장된다
    @Published var schoolRegion: String? =
        UserDefaults.standard.string(forKey: AppStore.slotKey("matths.schoolRegion")) {
        didSet {
            UserDefaults.standard.set(schoolRegion, forKey: AppStore.slotKey("matths.schoolRegion"))
        }
    }
    @Published var schoolCode: String? =
        UserDefaults.standard.string(forKey: AppStore.slotKey("matths.schoolCode")) {
        didSet {
            UserDefaults.standard.set(schoolCode, forKey: AppStore.slotKey("matths.schoolCode"))
        }
    }

    var schoolName: String? {
        guard let r = schoolRegion, let c = schoolCode else { return nil }
        return Schools.find(region: r, code: c)?.name
    }

    /// 학교 선택 — 웹처럼 목록 재검증 후에만 저장
    func setSchool(region: String, code: String) {
        guard Schools.find(region: region, code: code) != nil else { return }
        schoolRegion = region
        schoolCode = code
    }

    /// 테마: system | light | dark
    @Published var themePreference: String = UserDefaults.standard.string(forKey: "matths.theme") ?? "system" {
        didSet { UserDefaults.standard.set(themePreference, forKey: "matths.theme") }
    }

    /// 복습 리마인더 — 기기 로컬 알림(ReviewReminder). 값만 저장하고 읽는 곳이 한 곳도
    /// 없어서, 켜도 저녁 알림이 오지 않던 토글이었다 (2026-07-29 감사 적발).
    /// 앱이 하지 않는 일을 한다고 말하지 않으려면 토글이 실제로 예약을 걸어야 한다.
    @Published var reviewReminderOn: Bool = UserDefaults.standard.bool(forKey: "matths.reminder") {
        didSet {
            UserDefaults.standard.set(reviewReminderOn, forKey: "matths.reminder")
            guard reviewReminderOn else { ReviewReminder.cancelAll(); return }
            ReviewReminder.reschedule(wrongNotes) { [weak self] granted in
                // 권한이 거부되면 켜진 척하지 않는다 — 화면이 거짓말하는 쪽이 더 나쁘다
                guard !granted else { return }
                Task { @MainActor in self?.reviewReminderOn = false }
            }
        }
    }

    /// iOS 설정에서 알림 권한을 끈 뒤 앱으로 돌아왔을 때 토글이 켜진 척하지 않게 한다.
    /// 예약이 가능한 권한만 켬 상태로 인정하고, 거부·미결정 상태는 저장값도 함께 내린다.
    func refreshNotificationAuthorization() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        let canSchedule: Bool
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            canSchedule = true
        case .denied, .notDetermined:
            canSchedule = false
        @unknown default:
            canSchedule = false
        }
        if reviewReminderOn && !canSchedule {
            reviewReminderOn = false
        }
    }

    // 오답노트의 검색·필터·펼침 상태는 라우트 화면보다 오래 살아야 한다.
    // RootView의 route 교체로 WrongNotesScreen이 재생성되어도 여기서 이어 간다.
    @Published var wrongNoteExpanded: Set<String> = []
    @Published var wrongNoteFilterUnit: String?
    @Published var wrongNoteFilterError: String?
    @Published var wrongNoteQuery = ""
    @Published var wrongNoteSortKey: WrongNoteSort = .latest

    /// 화면 모션 (전환·등장·피드백 애니메이션). 기본 켬.
    /// 시스템 "동작 줄이기" 는 이 값과 무관하게 항상 이긴다 (Motion.swift).
    @Published var motionOn: Bool = UserDefaults.standard.object(forKey: "matths.motion") as? Bool ?? true {
        didSet { UserDefaults.standard.set(motionOn, forKey: "matths.motion") }
    }

    /// 왼손잡이 모드 — 풀이 화면에서 노트를 왼쪽에 둔다 (오른손이 문제를 가리지 않게,
    /// 왼손잡이는 그 반대가 필요하다)
    @Published var leftHandedOn: Bool = UserDefaults.standard.bool(forKey: "matths.leftHanded") {
        didSet { UserDefaults.standard.set(leftHandedOn, forKey: "matths.leftHanded") }
    }

    /// 표시 이름 — 홈 인사와 프로필. 실서비스에서는 로그인 프로필에서 온다.
    /// 서버 계정 이메일 — 표시 전용 (게스트면 빈 문자열)
    @Published var userEmail: String =
        UserDefaults.standard.string(forKey: AppStore.slotKey("matths.userEmail")) ?? "" {
        didSet {
            UserDefaults.standard.set(userEmail, forKey: AppStore.slotKey("matths.userEmail"))
        }
    }

    @Published var userName: String =
        UserDefaults.standard.string(forKey: AppStore.slotKey("matths.userName")) ?? "수빈" {
        didSet {
            UserDefaults.standard.set(userName, forKey: AppStore.slotKey("matths.userName"))
        }
    }

    /// 계정 슬롯별 UserDefaults 키.
    /// 파일(DataScope)만 계정별로 갈라 놓고 통계는 전역 키에 둔 탓에, 로그아웃하고
    /// 다른 계정으로 들어와도 앞사람의 푼 문항·정답률·최고 기록이 그대로 보였다
    /// (2026-07-29 감사 적발 — 한 기기를 형제가 같이 쓰면 사고다).
    /// 게스트는 옛 평평한 키를 그대로 쓴다 — 기존 설치의 기록을 잃지 않게.
    /// nonisolated — DataScope.slot 을 읽어 문자열을 만드는 순수 계산이라
    /// 액터 격리에 묶일 이유가 없다. KiceBank·ActivityLog 처럼 격리 밖에서도 쓴다.
    nonisolated static func slotKey(_ base: String) -> String {
        DataScope.slot == "guest" ? base : "\(base).\(DataScope.slot)"
    }

    /// 계정 슬롯 도입 전에는 프로필만 전역 UserDefaults 에 남았다. 업데이트 당시
    /// 로그인된 서버 계정과 이메일 해시가 일치할 때만 새 슬롯으로 옮긴다.
    /// 복사 뒤 옛 키를 비워야 로그아웃한 게스트 화면에 서버 프로필이 노출되지 않는다.
    nonisolated private static func migrateLegacyProfileIfNeeded() {
        guard DataScope.slot != "guest" else { return }
        let defaults = UserDefaults.standard
        guard let legacyEmail = defaults.string(forKey: "matths.userEmail"),
              !legacyEmail.isEmpty,
              DataScope.slotName(forEmail: legacyEmail) == DataScope.slot else { return }

        let keys = [
            "matths.grade", "matths.schoolRegion", "matths.schoolCode",
            "matths.userEmail", "matths.userName", "matths.gradePromoYear",
            "matths.lastCourse",
        ]
        for key in keys {
            let scoped = slotKey(key)
            if defaults.object(forKey: scoped) == nil,
               let legacy = defaults.object(forKey: key) {
                defaults.set(legacy, forKey: scoped)
            }
            defaults.removeObject(forKey: key)
        }
    }

    /// 누적 학습 통계 — gradeCurrent 가 갱신한다
    @Published var solvedTotal: Int = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.solved"))
    @Published var correctTotal: Int = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.correct"))

    var accuracy: Int {
        solvedTotal == 0 ? 0 : Int((Double(correctTotal) / Double(solvedTotal) * 100).rounded())
    }

    var gradeLabel: String {
        switch schoolGrade {
        case 10: return "고등학교 1학년"
        case 11: return "고등학교 2학년"
        case 12: return "고등학교 3학년"
        default: return "N수생"
        }
    }


    // MARK: 계정별 로컬 슬롯 (DataScope)

    /// 로그인/로그아웃으로 계정이 바뀌면 로컬 데이터 슬롯을 갈아끼우고 다시 읽는다.
    /// 이걸 안 하면 앞사람 진도·오답이 그대로 보인다.
    private func switchDataSlot(email: String?) {
        let target = DataScope.slotName(forEmail: email)
        guard target != DataScope.slot else { return }
        // 실행 중 결과가 슬롯 전환 뒤 다른 계정 파일에 적히지 않게 먼저 닫는다.
        interruptCheatingReviews(reason: "계정이 전환되어 로컬 판정을 중단했습니다.")
        guard DataScope.switchTo(target) else { return }
        clearTransientAccountState()
        reloadLocalData()
    }

    /// 파일에 저장하지 않는 풀이·튜터·시험 세션도 학생별 상태다. 새 슬롯에서 이전
    /// 학생의 답안이나 진행 중 시험을 다시 열 수 없도록 전환 순간에만 초기화한다.
    private func clearTransientAccountState() {
        assessmentDraftTask?.cancel()
        assessmentDraftTask = nil
        assessmentStartGeneration = UUID()
        assessmentSubmitting = false
        assessmentSyncError = nil
        lastGrading = nil
        reviewingNoteIDs = nil
        pendingReview = nil
        isVariationCheck = false
        examResults = []
        examStartedAt = nil
        solveStartedAt = nil
        stuckPoints = []
        chatSeedContext = nil
        lastStudentInput = nil
        rankPromotionPresentation = nil
        coach = CoachEngine()
        coachLine = nil
        coachGuidance = nil
        divergenceStep = nil
        selectedConceptV2ID = nil
        examSourceConceptV2ID = nil
        exam = []
        examIndex = 0
        lastExamSeed = 0
        currentAttemptID = nil
        kiceExamID = nil
        kiceAnswers = [:]
        kiceSubject = [:]
    }

    /// SyncEngine 이 오답노트 배열을 직접 만지지 않도록, 콜백을 한 번만 걸어 둔다.
    func wireSyncCallbacks() {
        SyncEngine.shared.onServerID = { [weak self] client, server in
            Task { @MainActor in self?.attachServerAttemptID(client: client, server: server) }
        }
        // 서버→로컬 수신부. 이게 없으면 SyncEngine 은 pull 요청 자체를 하지 않는다
        // (커서만 밀어 두면 그 구간 오답을 영영 못 받으므로 일부러 그렇게 막혀 있다).
        SyncEngine.shared.onRemoteWrongNotes = { [weak self] notes in
            Task { @MainActor in self?.mergeRemoteWrongNotes(notes) }
        }
        SyncEngine.shared.onRemoteProgress = { [weak self] rows in
            Task { @MainActor in self?.mergeRemoteProgress(rows) }
        }
        SyncEngine.shared.onRemoteStuckPoints = { [weak self] rows in
            Task { @MainActor in self?.mergeRemoteStuckPoints(rows) }
        }
        // 엔진 생성 시도는 콜백보다 먼저 일어날 수 있다. 수신부가 모두 연결된 뒤
        // 한 번 더 깨워야 첫 실행에서도 서버 진도가 즉시 보인다.
        Task { await SyncEngine.shared.syncNow() }
        Task { [weak self] in await self?.pullServerAssessments() }
    }

    /// 서버에서 받은 진도를 로컬과 합친다 — **덮지 않는다.**
    ///
    /// 덮어쓰면 비행기 모드에서 방금 푼 것이 사라진다. 유형·토픽은 합집합,
    /// 완료 플래그는 어느 쪽이든 true 면 true (진도는 되돌아가지 않는 값이다).
    /// 이 경로가 없던 동안에는 기기를 바꾸면 서버에 기록이 멀쩡한데도
    /// 학습 허브가 0% 로 보였다(2026-07-29 감사 적발).
    @MainActor
    func mergeRemoteProgress(_ rows: [ServerAPI.RemoteConceptProgress]) {
        guard !rows.isEmpty else { return }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        for r in rows {
            let when = r.lastStudiedAt.flatMap { iso.date(from: $0) ?? plain.date(from: $0) }
            progressV2.mergeRemote(
                conceptId: r.conceptId,
                topicIndexes: r.completedTopicIndexes ?? [],
                correctTypeIds: r.masteryGate?.correctTypeIds ?? [],
                userCompleted: r.masteryGate?.userCompleted == true,
                lastStudiedAt: when)
            if r.masteryGate?.userCompleted == true {
                // 구 평가센터 잠금은 v2 id가 아니라 legacy.appId 집합을 읽는다.
                if let appID = CurriculumV2.concept(r.conceptId)?.2.legacy?.appId {
                    completedConceptIDs.insert(appID)
                }
            }
        }
        progressV2.save()
        Progress.save(completedConceptIDs)
        objectWillChange.send()
    }

    /// 서버에서 받은 오답을 로컬과 합친다 — **문제 스냅샷은 로컬 우선,
    /// 복습 상태는 서버 갱신 시각 기준 최신 우선.**
    ///
    /// 로컬을 이기게 두는 이유: 필기 이미지·선지·단원처럼 서버가 보관하지 않는 것이
    /// 이쪽에만 있다. 서버 것으로 덮으면 그 자리가 빈 채로 남는다.
    /// 다른 기기에서 새로 생긴 오답은 앞에 붙이고, 이미 있는 오답은 필기·문장·
    /// 해설을 건드리지 않은 채 완료/예약/횟수와 serverAttemptId만 갱신한다.
    func mergeRemoteWrongNotes(_ notes: [WrongNoteEntry]) {
        var changed = false
        var fresh: [WrongNoteEntry] = []
        for remote in notes {
            guard let index = wrongNotes.firstIndex(where: { $0.id == remote.id }) else {
                fresh.append(remote)
                continue
            }

            // 매핑은 revision 비교와 무관하게 보완하고, 서버 관리 상태만 최신으로
            // 갱신한다. 필기·문장·해설 같은 로컬 스냅샷은 순수 병합 함수가 건드리지 않는다.
            changed = WrongNoteSyncMerge.apply(
                remote: remote, to: &wrongNotes[index]) || changed
        }
        if !fresh.isEmpty {
            wrongNotes.insert(contentsOf: fresh, at: 0)
            changed = true
        }
        guard changed else { return }
        WrongNoteDisk.save(wrongNotes)
        objectWillChange.send()
    }

    /// 서버가 오답에 붙인 id 를 받아 적는다 (복습 결과를 올릴 주소가 된다)
    func attachServerAttemptID(client: String, server: String) {
        guard let i = wrongNotes.firstIndex(where: { $0.id == client }) else { return }
        guard wrongNotes[i].serverAttemptId != server else { return }
        wrongNotes[i].serverAttemptId = server
        WrongNoteDisk.save(wrongNotes)
    }

    func mergeRemoteStuckPoints(_ rows: [ServerAPI.RemoteStuckPoint]) {
        let existing = Set(stuckPoints.map(\.id))
        let formatter = ISO8601DateFormatter()
        let fresh = rows.compactMap { row -> StuckPointRecord? in
            guard !existing.contains(row.id),
                  let date = formatter.date(from: row.createdAt) else { return nil }
            return StuckPointRecord(id: row.id, text: row.text, createdAt: date)
        }
        guard !fresh.isEmpty else { return }
        stuckPoints.append(contentsOf: fresh)
        stuckPoints.sort { $0.createdAt > $1.createdAt }
        StuckPointsDisk.save(stuckPoints)
    }

    /// 현재 슬롯의 파일들로 메모리 상태를 통째로 다시 채운다.
    func reloadLocalData() {
        wrongNotes = WrongNoteDisk.load()
        cheatingReviews = CheatingReviewDisk.loadRecoveringInterrupted()
        var p = ProgressV2Store.load()
        p.migrate(fromLegacyCompleted: Progress.load())
        progressV2 = p
        attemptsV2 = .load()
        completedConceptIDs = Progress.load()
        activityDays = ActivityLog.load()
        stuckPoints = StuckPointsDisk.load()
        dailyPlan = DailyPlanStore.load(dateKey: ActivityLog.dayString())
        serverStreak = AppStore.restoreStreak("matths.serverStreak")
        serverLongestStreak = AppStore.restoreStreak("matths.serverLongestStreak")
        schoolGrade = UserDefaults.standard.object(
            forKey: AppStore.slotKey("matths.grade")) as? Int ?? 12
        schoolRegion = UserDefaults.standard.string(
            forKey: AppStore.slotKey("matths.schoolRegion"))
        schoolCode = UserDefaults.standard.string(
            forKey: AppStore.slotKey("matths.schoolCode"))
        userEmail = UserDefaults.standard.string(
            forKey: AppStore.slotKey("matths.userEmail")) ?? ""
        userName = UserDefaults.standard.string(
            forKey: AppStore.slotKey("matths.userName")) ?? "수빈"
        selectedCourseV2ID = UserDefaults.standard.string(
            forKey: AppStore.slotKey("matths.lastCourseV2"))
        // 통계는 파일이 아니라 UserDefaults 에 있다 — 슬롯 키로 다시 읽지 않으면
        // 계정을 바꿔도 앞사람의 푼 문항·정답률·최고 기록이 화면에 그대로 남는다.
        solvedTotal = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.solved"))
        correctTotal = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.correct"))
        bestScore = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.bestScore"))
        bestElapsedMs = UserDefaults.standard.integer(forKey: AppStore.slotKey("matths.bestMs"))
        GoatArenaClientReviewOutbox.recoverCompleted(cheatingReviews)
        Task { await GoatArenaClientReviewOutbox.flush() }
        AITutor.shared.reloadConversationForCurrentSlot()
        resumePendingGoatArenaCheatingReviews()
        objectWillChange.send()
    }

    /// 서버 계정 로그인/가입 성공 — 서버 user 를 로컬 상태에 반영하고 입장
    func signInServer(_ user: ServerUser) {
        // ⚠️ 순서가 전부다.
        //  ① 게스트로 쌓아 둔 기록을 **먼저 손에 쥔다.** 슬롯을 옮기면 reloadLocalData 가
        //     메모리를 새 슬롯(빈 계정) 파일로 덮어써서, 그 뒤에 업로드하면 언제나
        //     빈 배열이 올라간다 — 게스트로 공부하다 가입한 사람의 기록이 통째로 증발한다.
        //     (2026-07-29 감사에서 적발. 실제로 acct 슬롯에 오답 0건이 올라갔다)
        //  ② 그 다음 슬롯을 옮기고, ③ 쥐고 있던 것을 올린다.
        // 서버가 계산한 스트릭을 받아 둔다 — 앱이 로컬에서 따로 세면 웹과 다른
        // 숫자가 나온다(기기 시간대·앱 미실행 구간 때문). 서버가 진실원이다.
        let incomingStreak = user.currentStreak
        let incomingLongest = user.longestStreak

        let carriedOver = DataScope.slot == "guest" ? wrongNotes : []
        // 통계도 같이 쥔다 — 슬롯별 키로 갈라 놓은 뒤로는 슬롯을 옮기는 순간
        // 푼 문항·정답률·최고 기록이 0으로 보인다. 오답만 옮기고 이걸 두고 오면
        // 가입한 사람 눈에는 "공부한 게 사라진" 것과 똑같다.
        let guestStats: (solved: Int, correct: Int, best: Int, ms: Int)? =
            DataScope.slot == "guest"
            ? (solvedTotal, correctTotal, bestScore, bestElapsedMs) : nil
        // 진도도 같이 쥔다. 오답·통계만 옮기고 진도를 두고 오면, 가입하는 순간
        // 학습 허브가 0% 로 되돌아간다 — 23차에 "로컬 진도 무손실" 로 실증했던
        // 계약이 그 뒤 슬롯 분리로 깨져 있었다(2026-07-29 감사 적발).
        // 서버에서 진도를 되받는 경로도 없으니 여기서 안 옮기면 영영 사라진다.
        let guestProgress: (v2: ProgressV2Store, attempts: AttemptStoreV2, done: Set<String>)? =
            DataScope.slot == "guest" ? (progressV2, attemptsV2, completedConceptIDs) : nil
        var transferredProgress: ProgressV2Store?
        switchDataSlot(email: user.email)
        if let n = user.name, !n.isEmpty { userName = n }
        // 계정 식별용 이메일 — 프로필에서 "어느 계정으로 들어와 있는지" 를 보여준다.
        // 비밀번호·토큰은 절대 여기 두지 않는다(토큰은 키체인).
        userEmail = user.email ?? userEmail
        if let g = user.schoolGrade { schoolGrade = g }
        if let r = user.school?.region, let c = user.school?.code {
            schoolRegion = r
            schoolCode = c
        }
        signIn(provider: "server")
        // **슬롯을 옮긴 뒤에** 세팅한다. slotKey 가 새 슬롯을 가리켜야
        // 이 계정의 키에 저장되고, 재실행 때도 같은 계정에서 복원된다.
        serverStreak = incomingStreak
        serverLongestStreak = incomingLongest
        // 게스트로 쌓아 둔 기록을 계정으로 승계한다 — 서버로 올리고, 이 계정 슬롯에도
        // 병합해 둔다(서버 왕복 없이도 화면에서 바로 보이게). 같은 문제는 id 로 걸러진다.
        if !carriedOver.isEmpty {
            let existing = Set(wrongNotes.map(\.id))
            let fresh = carriedOver.filter { !existing.contains($0.id) }
            if !fresh.isEmpty {
                wrongNotes.insert(contentsOf: fresh, at: 0)
                WrongNoteDisk.save(wrongNotes)
            }
        }
        // 통계 승계는 **아직 기록이 없는 계정**에만 한다. 이미 쌓인 계정에 더하면
        // 재로그인마다 게스트 활동이 얹혀 숫자가 부풀고, 남이 쓰던 게스트 기록까지
        // 그 계정 것이 된다 (계정 분리를 하려다 반대쪽으로 새는 길).
        if let g = guestStats, solvedTotal == 0, correctTotal == 0 {
            solvedTotal = g.solved
            correctTotal = g.correct
            UserDefaults.standard.set(solvedTotal, forKey: AppStore.slotKey("matths.solved"))
            UserDefaults.standard.set(correctTotal, forKey: AppStore.slotKey("matths.correct"))
            if bestScore == 0 {
                bestScore = g.best
                bestElapsedMs = g.ms
                UserDefaults.standard.set(bestScore, forKey: AppStore.slotKey("matths.bestScore"))
                UserDefaults.standard.set(bestElapsedMs, forKey: AppStore.slotKey("matths.bestMs"))
            }
        }
        // 진도 승계 — 통계와 같은 가드(빈 계정에만). 이미 공부한 계정에 게스트
        // 진도를 얹으면 남이 쓰던 기록이 그 계정 것이 된다.
        if let gp = guestProgress,
           completedConceptIDs.isEmpty, progressV2.byConcept.isEmpty,
           attemptsV2.attempts.isEmpty {
            progressV2 = gp.v2
            attemptsV2 = gp.attempts
            completedConceptIDs = gp.done
            progressV2.save()
            attemptsV2.save()
            Progress.save(completedConceptIDs)
            transferredProgress = gp.v2
            objectWillChange.send()
        }
        // 슬롯 승계가 끝난 뒤 올린다. 토픽·유형·완료를 모두 서버에 먼저 밀고,
        // 이어서 서버에만 있던 진도와 오답을 다시 받아 합친다.
        if !carriedOver.isEmpty || transferredProgress != nil {
            SyncEngine.shared.uploadLocalSnapshot(
                wrongNotes: carriedOver,
                progress: transferredProgress)
        }
        // 같은 계정 재로그인 시 미전송분 재적재 (B-09).
        // 토큰 만료 구간(과거 버전은 큐에도 못 쌓았다)·큐 파일 유실로 서버 확인
        // (serverAttemptId)을 받지 못한 오답이 이 슬롯에 남아 있을 수 있다 — 재로그인이
        // 그 기록이 다시 올라갈 유일한 계기다. bulk 전송은 clientAttemptId 멱등이라
        // 이미 올라간 것이 섞여도 서버가 거르고, serverAttemptId 가 붙는 순간부터는
        // 이 필터에 다시 걸리지 않는다(자기 제한적).
        // carriedOver(게스트 승계분)는 위 uploadLocalSnapshot 이 올리므로 제외한다.
        // 상한 100건은 uploadLocalSnapshot 과 같은 규약.
        let carriedIDs = Set(carriedOver.map(\.id))
        let unsent = wrongNotes.filter {
            $0.serverAttemptId == nil && !carriedIDs.contains($0.id)
        }
        for note in unsent.prefix(100) {
            SyncEngine.shared.enqueueWrongNote(note)
        }
        Task { [weak self] in await self?.pullServerAssessments() }
    }

    func signOut() {
        ServerAPI.logout()          // 서버 계정이었으면 토큰 폐기 (게스트면 no-op)
        authProvider = nil
        switchDataSlot(email: nil)          // 게스트 슬롯으로 — 앞 계정 기록이 남지 않게
        UserDefaults.standard.removeObject(forKey: "matths.auth")
        route = .home
    }

    /// 진도 초기화 — 프로필의 파괴적 동작. 확인 다이얼로그 뒤에서만 부른다.
    ///
    /// v2 진도 초기화도 **여기서** 한다 — 호출부(다이얼로그 클로저)가 따로 기억하게
    /// 두면 resetProgress 를 부르는 두 번째 호출부가 생기는 순간 절반만 초기화되는
    /// 무음 결함이 된다 (F-01: 불변식은 소유자가 완결한다).
    func resetProgress() {
        completedConceptIDs = []
        Progress.save([])
        progressV2 = ProgressV2Store()
        progressV2.save()
        solvedTotal = 0
        correctTotal = 0
        UserDefaults.standard.set(0, forKey: AppStore.slotKey("matths.solved"))
        UserDefaults.standard.set(0, forKey: AppStore.slotKey("matths.correct"))
        if authProvider == "server" {
            SyncEngine.shared.enqueueProgressReset()
        }
    }

    // MARK: 코치 — 스크립트 풀 기반, LLM 불필요 (CoachEngine.swift)

    @Published var coach = CoachEngine()
    /// 채점 직후 코치가 한 말. 결과 화면 말풍선에 표시된다.
    @Published var coachLine: String?
    /// 무작위 대사 대신 결과 화면에 표시하는 관찰·이유·다음 행동.
    @Published var coachGuidance: CoachGuidance?

    /// 학생이 "여기서부터 갈라졌다" 고 짚은 풀이 단계 (1부터). nil = 아직 선택 안 함.
    /// 이 값이 errorAnalysis.firstErrorStep 후보로 서버에 가고,
    /// 오답노트 복습이 이 단계부터 다시 시작된다.
    @Published var divergenceStep: Int?

    #if DEBUG
    /// 전역 디버그 바의 "Pro" 버튼 → ProScreen 이 결과 화면으로 바로 열리게 하는 플래그
    @Published var debugProReport = false
    #endif

    // MARK: 로그인 게이트의 진실원
    //
    // 로그인 여부는 이 값(UserDefaults "matths.auth")이 결정한다 — 키체인 토큰이 아니다.
    //   nil      = 미로그인 (AuthScreen)
    //   "guest"  = 게스트 (아무것도 서버로 보내지 않는다)
    //   "server" = 서버 계정 (슬롯 acct-<해시>, 키체인에 Bearer 토큰)
    // 키체인 토큰과의 화해 규칙: 토큰은 앱 삭제 후에도 살아남으므로,
    // authProvider != "server" 인데 토큰이 남아 있으면 잘못 남은 것이다 —
    // init 이 폐기한다 (S-02: 재설치 잔존 토큰의 게스트 슬롯 오염 차단).
    @Published var authProvider: String? = UserDefaults.standard.string(forKey: "matths.auth")
    /// 서버가 현재 Bearer 토큰을 거절해 인증 화면으로 돌아온 이유. 일반 로그아웃에는
    /// 표시하지 않고, 새 로그인이 시작되거나 성공하면 지운다.
    @Published private(set) var authenticationNotice: String?

    func signIn(provider: String) {
        authenticationNotice = nil
        authProvider = provider
        UserDefaults.standard.set(provider, forKey: "matths.auth")
    }

    func clearAuthenticationNotice() {
        authenticationNotice = nil
    }

    // MARK: 커리큘럼 v2 — 2022 개정 전 과목 (CurriculumV2.swift, 웹 레포 진실원)

    /// v2 진도 — topic 30% + 유형 60% + 완료체크 100% (웹 공식)
    @Published var progressV2: ProgressV2Store = {
        var store = ProgressV2Store.load()
        // 구 진도 1회 이관 (v2 기록이 없는 개념만 — 사용자 데이터 보호)
        store.migrate(fromLegacyCompleted: Progress.load())
        store.save()
        return store
    }()

    /// v2 학습 화면이 보는 개념 id (웹 3계층 id)
    @Published var selectedConceptV2ID: String?
    /// v2 허브에서 펼친 과목 — Split View 전환·앱 재실행 뒤에도 같은 과목을 유지한다.
    @Published var selectedCourseV2ID: String? =
        UserDefaults.standard.string(forKey: AppStore.slotKey("matths.lastCourseV2")) {
        didSet {
            UserDefaults.standard.set(
                selectedCourseV2ID,
                forKey: AppStore.slotKey("matths.lastCourseV2"))
        }
    }
    /// v2 개념에서 시작한 연습 세트 — 유형 다양성 게이트에 정답 유형을 적립한다
    var examSourceConceptV2ID: String?

    func openConceptV2(_ id: String) {
        selectedConceptV2ID = id
        if let (course, _, _) = CurriculumV2.concept(id) {
            selectedCourseV2ID = course.id
        }
        route = .concept
    }

    /// 결과 화면처럼 개념 좌표가 직접 없는 진입도 구 5과목 화면으로 되돌리지 않는다.
    /// 현재 v2 개념을 우선하고, 네이티브 유형이 가리키는 개념, 이어서 학습 순으로 연다.
    func openRelevantConceptV2(typeKey: String? = nil) {
        if let selectedConceptV2ID,
           CurriculumV2.concept(selectedConceptV2ID) != nil {
            openConceptV2(selectedConceptV2ID)
            return
        }

        let rawType = typeKey ?? ""
        let canonicalType = rawType.hasPrefix("web-")
            ? String(rawType.dropFirst(4))
            : rawType
        if ProblemType(rawValue: canonicalType) != nil {
            for course in CurriculumV2.data.courses {
                for unit in course.units {
                    if let concept = unit.concepts.first(where: {
                        $0.practiceTypes.contains(canonicalType)
                    }) {
                        openConceptV2(concept.id)
                        return
                    }
                }
            }
        }

        if let (_, _, concept) = progressV2.continueConcept() {
            openConceptV2(concept.id)
        } else {
            route = .curriculum
        }
    }

    func saveProgressV2() { progressV2.save() }

    // MARK: 구 앱 완료 ID 하위 호환 (v2 마이그레이션·과거 평가 기록용)

    @Published var completedConceptIDs: Set<String> = Progress.load()

    func markConceptComplete(_ id: String) {
        completedConceptIDs.insert(id)
        Progress.save(completedConceptIDs)
        // v2 화면에서 legacy.appId 호환 기록을 남긴 경우에도 같은 완료를 v2 진도와
        // 서버 큐에 즉시 반영한다. reloadLocalData의 마이그레이션을 기다리지 않아야
        // 같은 세션에서 평가센터 잠금과 다른 기기의 진도가 바로 일치한다.
        guard let (course, unit, concept) = Self.v2Concept(forLegacyAppID: id) else {
            // 매핑 불가 — v2 커리큘럼(curriculum-v2.json)에 legacy.appId 대응이 없는
            // 구 개념이다(개편에서 빠진 id 등). 서버 진도 문서는 v2 id 좌표계라
            // 표현할 주소 자체가 없다. 로컬 구 진도에는 위에서 이미 남겼으므로
            // 학생 화면은 완료로 보인다 — 서버 전송만 건너뛰고 증거를 남긴다.
            NSLog("SYNC-SKIP v2 매핑 없는 개념 완료 — 서버 미전송: %@", id)
            return
        }
        progressV2.setUserCompleted(true, concept: concept)
        saveProgressV2()
        SyncEngine.shared.enqueueConceptCompletion(
            courseId: course.id, unitId: unit.id, conceptId: concept.id)
    }

    /// 구 커리큘럼 개념 id(legacy.appId) → v2 (과목, 단원, 개념) 역매핑.
    /// migrate(fromLegacyCompleted:)·mergeRemoteProgress 가 쓰는 것과 같은
    /// legacy.appId 대응 관계의 역방향이다 — 근거가 갈라지면 안 된다.
    private static func v2Concept(forLegacyAppID appID: String) -> (CourseV2, UnitV2, ConceptV2)? {
        for course in CurriculumV2.data.courses {
            for unit in course.units {
                if let concept = unit.concepts.first(where: { $0.legacy?.appId == appID }) {
                    return (course, unit, concept)
                }
            }
        }
        return nil
    }

    // MARK: 동적 모의고사 — ProblemGenerator 가 기기 안에서 만든다 (AI·서버 불필요)

    @Published var exam: [GeneratedProblem] = []
    @Published var examIndex = 0
    /// 이 회차를 재현할 수 있는 시드. 이의제기·리포트에 그대로 쓴다.
    @Published var lastExamSeed: UInt64 = 0

    var currentProblem: GeneratedProblem? {
        exam.indices.contains(examIndex) ? exam[examIndex] : nil
    }

    /// 새 모의고사 시작. seed 를 안 주면 시각 기반 — 회차마다 수치·정답이 달라진다.
    func startExam(types: [ProblemType], count: Int = 4, seed: UInt64? = nil) {
        let s = seed ?? UInt64(Date().timeIntervalSince1970)
        lastExamSeed = s
        exam = ExamFactory.make(types: types, count: count, seed: s)
        examIndex = 0
        lastGrading = nil
        examSourceConceptV2ID = nil     // 스테일 소스로 남의 개념에 유형이 적립되면 안 된다
        reviewingNoteIDs = nil
        examResults = []
        // 새 세트는 확인 문항이 아니다 — 플래그가 남으면 다음 채점이 통째로 기록되지 않는다.
        // (startVariationCheck 는 이 함수 **뒤에** 다시 세운다)
        pendingReview = nil
        isVariationCheck = false
        examStartedAt = Date()
        solveStartedAt = Date()
        route = .solve
    }

    /// 이미 만들어진 문항 배열로 시험 시작 (뱅크 시험용)
    func startExam(problems: [GeneratedProblem], seed: UInt64) {
        guard !problems.isEmpty else { return }
        lastExamSeed = seed
        exam = problems
        examIndex = 0
        lastGrading = nil
        examSourceConceptV2ID = nil     // 웹 연습은 호출측이 이 함수 뒤에 다시 세팅한다
        reviewingNoteIDs = nil
        examResults = []
        pendingReview = nil             // 새 세트 — 접어 둔 복습을 잘못 펴지 않게
        isVariationCheck = false
        examStartedAt = Date()
        // 이미 조립된 뱅크/WebGen 문항도 첫 문항부터 풀이 시간을 재야 한다.
        // 이 값이 없으면 첫 문항의 durationMs만 nil로 서버에 올라간다.
        solveStartedAt = examStartedAt
        route = .solve
    }

    /// 오답 복습 시작 — 틀렸던 **바로 그 문제들**을 그대로 다시 낸다.
    /// 수치를 바꾸지 않는 것이 요점이다. 맞히면 간격 전진, 틀리면 처음부터.
    /// ids 를 주면 그 목록으로 좁힌다 — 오답노트에서 필터·검색을 걸어 둔 상태라면
    /// 화면에 보이는 그 집합만 복습해야 한다("(N)" 라벨과 실제 세트가 어긋나던 버그).
    func startReview(ids: [String]? = nil) {
        let selected: [WrongNoteEntry]
        if let ids {
            // 호출부가 고른 목록을 그대로 연다. 오답노트의 "미리 복습"은 아직
            // 예정일이 오지 않은 항목을 넘기므로 여기서 다시 isDue로 거르면 버튼이
            // 아무 일도 하지 않는다. 졸업 항목만 제외해 이미 끝난 복습의 부활을 막는다.
            let requested = Set(ids)
            selected = wrongNotes.filter { requested.contains($0.id) && !$0.isMastered }
        } else {
            selected = wrongNotes.filter(\.isDue)
        }
        guard !selected.isEmpty else { return }
        exam = selected.map(\.asProblem)
        reviewingNoteIDs = selected.map(\.id)
        examIndex = 0
        lastGrading = nil
        // 복습은 특정 개념의 연습이 아니다. 남겨 두면 직전에 이탈한 개념에
        // 오답 문항의 유형이 적립돼 진도가 부풀고, 세트 종료 후 오답노트가 아니라
        // 그 개념 화면으로 튄다 (startExam 두 진입점과 같은 규약).
        examSourceConceptV2ID = nil
        examResults = []
        pendingReview = nil             // 새 복습 세트 — 접어 둔 옛 세트는 버린다
        isVariationCheck = false
        examStartedAt = Date()
        route = .solve
    }

    /// 세션 중도 이탈 — 풀이 화면 좌상단 닫기. 진행 상태를 한 곳에서 정리한다.
    /// exam 만 비우고 소스 id 를 남기면 다음 세션이 그 개념에 결과를 적립한다.
    func abandonExam() {
        let wasExam = !exam.isEmpty
        // 복습에서 나가면 오답노트로 — 정상 종료(advanceExam)와 같은 목적지여야 한다.
        // .assess 로 보내면 복습하러 들어온 학생이 평가센터에 떨어진다.
        // (확인 문항 도중 이탈도 출발지는 복습이므로 pendingReview 를 함께 본다)
        let wasReview = reviewingNoteIDs != nil || pendingReview != nil
        exam = []
        examResults = []
        examIndex = 0
        lastGrading = nil
        divergenceStep = nil
        examSourceConceptV2ID = nil
        reviewingNoteIDs = nil
        pendingReview = nil
        isVariationCheck = false
        route = wasReview ? .wrongNotes : (wasExam ? .assess : .concept)
    }

    /// 최종 답만 로컬 대조한다. 풀이 단계 채점은 서버(ai-grader)의 몫이고,
    /// 여기서는 그 결과 계약(GradingResult)에 맞춰 채워 넣는다.
    /// drawingPNG: 풀이 노트 필기 스냅샷 — 틀리면 오답노트에 함께 저장된다.
    func gradeCurrent(input: String, drawingPNG: Data? = nil) {
        guard let p = currentProblem else { return }
        lastStudentInput = input          // 결과 화면 "AI에게 묻기" 맥락용
        if let drawingPNG {
            enqueueCheatingReview(
                imageData: drawingPNG,
                source: .practiceDrawing,
                problemID: p.id,
                context: CheatingProblemContext(
                    statement: p.statement,
                    expectedAnswer: p.answer,
                    referenceSteps: p.steps,
                    studentFinalAnswer: input,
                    // 객관식은 최종 답 제출만으로도 정상이라 answer-only 근거를 허용하지 않는다.
                    requiresWork: !p.isMultipleChoice))
        }
        let ok = p.matches(input)
        // 코치는 채점하지 않는다. 정오 결과를 받아 관찰 → 점검 이유 → 다음 행동만 만든다.
        coachGuidance = coach.guidance(
            problem: p,
            studentInput: input,
            correct: ok
        )
        coachLine = nil
        divergenceStep = nil          // 문항마다 새로 짚는다
        // "같은 유형 새 수치" 확인 문항은 **기록 없는 확인**이 규약이다(16차 ②).
        // 여기서 빠져나가지 않으면 확인용 1문항이 새 오답을 만들어(복습이 끝나지 않는다)
        // 유형 게이트·정답률·학습 이벤트까지 확인 문항으로 부풀린다.
        guard !isVariationCheck else {
            lastGrading = makeGrading(p, correct: ok)
            route = .result
            return
        }
        // v2 유형 다양성 게이트 + 정오 신호 (웹 masteryGate·signals)
        if let v2id = examSourceConceptV2ID {
            if ok { progressV2.recordCorrectType(p.typeKey, conceptID: v2id) }
            progressV2.recordAttempt(correct: ok, conceptID: v2id)
            progressV2.save()
            // 서버에도 같은 사실을 올린다(로컬 우선 — 큐에 쌓고 온라인 때 전송)
            if ok, let (course, unit, _) = CurriculumV2.concept(v2id) {
                SyncEngine.shared.enqueueMastery(courseId: course.id, unitId: unit.id,
                                                 conceptId: v2id, typeKey: p.typeKey)
            }
        }
        SyncEngine.shared.enqueueEvent(ok ? "problem-correct" : "problem-wrong",
                                       conceptId: examSourceConceptV2ID, correct: ok,
                                       durationMs: solveStartedAt.map { Int(Date().timeIntervalSince($0) * 1000) })
        // 학습 이벤트 — 대시보드 주간 통계의 원천
        EventLog.append(ok ? "problem-correct" : "problem-wrong",
                        conceptId: examSourceConceptV2ID,
                        durationMs: solveStartedAt.map { Int(Date().timeIntervalSince($0) * 1000) })
        solveStartedAt = Date()
        // 누적 통계 (프로필 정답률) + 학습일 기록
        solvedTotal += 1
        if ok { correctTotal += 1 }
        UserDefaults.standard.set(solvedTotal, forKey: AppStore.slotKey("matths.solved"))
        UserDefaults.standard.set(correctTotal, forKey: AppStore.slotKey("matths.correct"))
        activityDays = ActivityLog.recordToday()
        examResults.append(ok)

        // ── 오답노트 실동작 ─────────────────────────────────────────────
        if let idx = reviewingNoteIDs?.indices.contains(examIndex) == true
                     ? reviewingNoteIDs?[examIndex] : nil,
           let noteIdx = wrongNotes.firstIndex(where: { $0.id == idx }) {
            // 복습 중 — 간격 전진 또는 리셋. 새 항목은 만들지 않는다(중복 방지).
            if ok { WrongNoteSRS.afterCorrect(&wrongNotes[noteIdx]) }
            else {
                WrongNoteSRS.afterWrong(&wrongNotes[noteIdx])
                // 복습에서 또 틀렸으면 **그때 쓴 답**이 진단의 최신 재료다.
                // 이걸 갱신하지 않으면 AI 진단이 학생 답 없이 모범 풀이만 읽는다.
                // (맞혔을 때는 덮지 않는다 — 진단이 볼 것은 틀렸던 답이다)
                wrongNotes[noteIdx].myAnswer = input
                if let png = drawingPNG {
                    wrongNotes[noteIdx].drawingPNGBase64 = png.base64EncodedString()
                }
            }
            WrongNoteDisk.save(wrongNotes)
            // 서버에도 올린다 — 이걸 빠뜨리면 기기를 바꿨을 때 복습 진도가 통째로 되감긴다.
            // (엔드포인트는 있었는데 호출부가 한 곳도 없었다 — 2026-07-29 감사 적발)
            SyncEngine.shared.enqueueReviewResult(wrongNotes[noteIdx], correct: ok)
        } else if !ok {
            // 일반 풀이에서 틀림 — 같은 문항이 이미 있으면 갱신, 없으면 적재
            if let existing = wrongNotes.firstIndex(where: {
                $0.problemID == p.id && $0.typeKey == p.typeKey && !$0.isMastered
            }) {
                WrongNoteSRS.afterWrong(&wrongNotes[existing])
                wrongNotes[existing].myAnswer = input
                if let png = drawingPNG { wrongNotes[existing].drawingPNGBase64 = png.base64EncodedString() }
                // 재오답도 서버에 알린다 — 서버 id 유무에 따라 SyncEngine 이 경로를 고른다.
                // (id 가 없던 새 오답이 조용히 버려지던 구멍을 막는다)
                SyncEngine.shared.enqueueWrongAgain(wrongNotes[existing])
            } else {
                wrongNotes.insert(WrongNoteEntry(
                    id: UUID().uuidString, problemID: p.id, typeKey: p.typeKey,
                    typeName: p.typeName, unit: p.unit, statement: p.statement,
                    answer: p.answer, steps: p.steps, seed: lastExamSeed,
                    divergenceStep: nil,
                    drawingPNGBase64: drawingPNG?.base64EncodedString(),
                    srsStage: 0, nextReviewAt: Date(),   // 최초 복습은 당일
                    wrongCount: 1, createdAt: Date(),
                    // 뱅크 5지선다 문항은 선지·KaTeX 플래그가 있어야 복습 때
                    // 같은 모습(웹뷰 + ①~⑤)으로 재출제된다 — 빠뜨리면 주관식으로 둔갑한다
                    choices: p.choices, isTex: p.isTex,
                    myAnswer: input,         // 진단이 볼 "그때 내가 쓴 답"
                    // 시각 힌트도 함께 — 복습 화면의 그래프 힌트 원천
                    hintText: p.hintText, visualizationJSON: p.visualizationJSON
                ), at: 0)
                if let fresh = wrongNotes.first { SyncEngine.shared.enqueueWrongNote(fresh) }
            }
            WrongNoteDisk.save(wrongNotes)
        }
        lastGrading = makeGrading(p, correct: ok)
        route = .result
    }

    /// Pro 시험지 사진 분석이 끝난 뒤 같은 원본을 딱 한 번만 추가 검사한다.
    /// SheetGrader가 만든 문항/정답 맥락을 받되 그 채점 결과 자체는 절대 수정하지 않는다.
    func enqueueSheetCheatingReview(imagePath: String, context: CheatingProblemContext) {
        guard let data = try? Data(contentsOf: URL(fileURLWithPath: imagePath)), !data.isEmpty else {
            let result = CheatingDetectionResult.inconclusive("시험지 사진 파일을 다시 열지 못했습니다.")
            let begun = CheatingReviewDisk.begin(
                source: .sheetPhoto, problemID: nil, context: context, imageData: Data())
            cheatingReviews.insert(begun.record, at: 0)
            cheatingReviews = CheatingReviewDisk.finish(id: begun.record.id, result: result)
            return
        }
        enqueueCheatingReview(imageData: data, source: .sheetPhoto,
                              problemID: nil, context: context)
    }

    /// GOAT 사진 접수는 60초 안에 먼저 끝낸다. 접수된 원본을 로컬 보관 크기로
    /// 복사한 뒤 사진별 비전 검토를 직렬 실행하고, 결과는 비확정 신호로만 후속 전송한다.
    func enqueueGoatArenaEvidenceReviews(
        fileURLs: [URL],
        matchId: String,
        evidenceId: String,
        clientBuildVersion: String,
        context: CheatingProblemContext
    ) {
        let delivery = GoatArenaCheatingReviewDelivery(
            matchId: matchId,
            evidenceId: evidenceId,
            clientBuildVersion: clientBuildVersion)
        for (index, url) in fileURLs.prefix(5).enumerated() {
            guard let data = try? Data(contentsOf: url), !data.isEmpty else { continue }
            enqueueCheatingReview(
                imageData: data,
                source: .goatArenaEvidence,
                problemID: "\(matchId):\(index + 1)",
                context: context,
                arenaDelivery: delivery,
                onComplete: goatArenaReviewCompletion(delivery))
        }
    }

    private func goatArenaReviewCompletion(
        _ delivery: GoatArenaCheatingReviewDelivery
    ) -> (UUID, CheatingDetectionResult) -> Void {
        { reviewId, result in
            GoatArenaClientReviewOutbox.enqueue(
                GoatArenaClientReviewOutbox.item(
                    reviewId: reviewId,
                    result: result,
                    delivery: delivery))
            Task { await GoatArenaClientReviewOutbox.flush() }
        }
    }

    func latestCheatingReview(problemID: String? = nil,
                              source: CheatingReviewSource? = nil) -> CheatingReviewRecord? {
        cheatingReviews.first {
            (problemID == nil || $0.problemID == problemID)
                && (source == nil || $0.source == source)
        }
    }

    private func enqueueCheatingReview(imageData: Data,
                                       source: CheatingReviewSource,
                                       problemID: String?,
                                       context: CheatingProblemContext,
                                       arenaDelivery: GoatArenaCheatingReviewDelivery? = nil,
                                       onComplete: ((UUID, CheatingDetectionResult) -> Void)? = nil) {
        let begun = CheatingReviewDisk.begin(
            source: source, problemID: problemID, context: context,
            imageData: imageData, arenaDelivery: arenaDelivery)
        cheatingReviews.removeAll { $0.id == begun.record.id }
        cheatingReviews.insert(begun.record, at: 0)

        guard let imagePath = begun.imagePath else {
            let result = CheatingDetectionResult.inconclusive(
                "풀이 이미지를 검토용 크기로 준비하지 못했습니다.")
            cheatingReviews = CheatingReviewDisk.finish(
                id: begun.record.id,
                result: result)
            onComplete?(begun.record.id, result)
            return
        }

        startCheatingReview(
            record: begun.record,
            imagePath: imagePath,
            context: context,
            onComplete: onComplete)
    }

    private func startCheatingReview(
        record: CheatingReviewRecord,
        imagePath: String,
        context: CheatingProblemContext,
        onComplete: ((UUID, CheatingDetectionResult) -> Void)?
    ) {
        guard cheatingReviewTasks[record.id] == nil else { return }

        let flag = CheatingDetectionCancelFlag()
        cheatingReviewFlags[record.id] = flag
        let predecessor = cheatingReviewQueueTail
        let task = Task { [weak self] in
            // 앞 검토의 모델 전환·추론·정리가 전부 끝난 뒤 다음 사진을 연다.
            await predecessor?.value
            let backgroundToken = LocalAIBackgroundExecution.shared.beginWork("풀이 무결성 검토")
            defer { LocalAIBackgroundExecution.shared.endWork(backgroundToken) }
            guard let self else { return }
            let result = await self.runCheatingReview(
                imagePath: imagePath, context: context, cancel: flag)
            guard !flag.isCancelled else { return }
            self.cheatingReviews = CheatingReviewDisk.finish(id: record.id, result: result)
            onComplete?(record.id, result)
            self.cheatingReviewFlags.removeValue(forKey: record.id)
            self.cheatingReviewTasks.removeValue(forKey: record.id)
            if self.cheatingReviewTasks.isEmpty {
                self.cheatingReviewQueueTail = nil
            }
        }
        cheatingReviewTasks[record.id] = task
        cheatingReviewQueueTail = task
    }

    private func resumePendingGoatArenaCheatingReviews() {
        for record in cheatingReviews where record.state == .pending &&
            record.source == .goatArenaEvidence {
            guard let context = record.problemContext,
                  let delivery = record.arenaDelivery,
                  let imagePath = CheatingReviewDisk.imageURL(for: record)?.path,
                  FileManager.default.fileExists(atPath: imagePath)
            else {
                cheatingReviews = CheatingReviewDisk.finish(
                    id: record.id,
                    result: .inconclusive("재시작할 로컬 검토 자료를 찾지 못했습니다."))
                continue
            }
            startCheatingReview(
                record: record,
                imagePath: imagePath,
                context: context,
                onComplete: goatArenaReviewCompletion(delivery))
        }
    }

    private func runCheatingReview(imagePath: String,
                                   context: CheatingProblemContext,
                                   cancel: CheatingDetectionCancelFlag) async -> CheatingDetectionResult {
        if cancel.isCancelled || Task.isCancelled {
            return .inconclusive("로컬 판정이 중단되었습니다.")
        }

        // 모델 파일 다운로드·해시는 LLMEngine을 쓰지 않는다. 낮은 우선순위 검토가
        // 이 준비 시간까지 lease를 쥐면, 첫 다운로드 동안 학생이 기다리는 채점·튜터가
        // 대기열 우선순위와 무관하게 전부 막힌다. 준비가 끝난 뒤에만 엔진을 소유한다.
        do {
            try await LocalAIModelPack.shared.prepareForSheetAnalysis()
        } catch {
            return .inconclusive("사진 판독 모델을 준비하지 못했습니다: \(error.localizedDescription)")
        }
        if cancel.isCancelled || Task.isCancelled {
            return .inconclusive("로컬 판정이 중단되었습니다.")
        }

        let workLease: LocalAIWorkCoordinator.Lease
        do {
            // 후속 검토는 학생이 기다리는 채점·튜터보다 낮은 우선순위로 기다린다.
            // 바쁘다는 이유만으로 영구 판정불가 처리하지 않는다.
            workLease = try await LocalAIWorkCoordinator.shared.acquire(.integrityReview)
        } catch is CancellationError {
            return .inconclusive("로컬 판정이 중단되었습니다.")
        } catch {
            return .inconclusive("로컬 판정 순서를 준비하지 못했습니다.")
        }

        let result = await runCheatingReviewWithLease(
            imagePath: imagePath,
            context: context,
            cancel: cancel)
        await LocalAIWorkCoordinator.shared.release(workLease)
        return result
    }

    private func runCheatingReviewWithLease(
        imagePath: String,
        context: CheatingProblemContext,
        cancel: CheatingDetectionCancelFlag
    ) async -> CheatingDetectionResult {
        let tutor = AITutor.shared
        if cancel.isCancelled || Task.isCancelled {
            return .inconclusive("로컬 판정이 중단되었습니다.")
        }

        let visionFile = ModelDownloader.analysisVisionSpec.file
        guard await tutor.switchModel(toFile: visionFile), tutor.visionAvailable else {
            return .inconclusive("현재 기기에서 사진 판독 모델을 열지 못했습니다.")
        }
        return await tutor.inspectCheating(
            imagePath: imagePath, context: context, cancel: cancel)
    }

    private func interruptCheatingReviews(reason: String) {
        guard !cheatingReviewFlags.isEmpty || cheatingReviews.contains(where: { $0.state == .pending })
        else { return }
        for flag in cheatingReviewFlags.values { flag.cancel() }
        for task in cheatingReviewTasks.values { task.cancel() }
        cheatingReviewFlags.removeAll()
        cheatingReviewTasks.removeAll()
        cheatingReviewQueueTail = nil
        cheatingReviews = CheatingReviewDisk.interruptPending(reason: reason)
    }

    /// 채점 결과 계약 채우기. 확인 문항도 같은 결과 화면을 쓰므로,
    /// "기록하는 일" 과 "보여 주는 일" 을 갈라 놓고 보여 주는 쪽은 한 곳에서만 만든다.
    private func makeGrading(_ p: GeneratedProblem, correct ok: Bool) -> GradingResult {
        GradingResult(
            overall: ok ? .correct : .incorrect,
            firstErrorStep: nil,
            errorType: .none,
            stepResults: p.steps.enumerated().map { i, _ in
                StepResult(step: i + 1,
                           verdict: ok ? .correct : .unverifiable,
                           comment: ok ? "성립합니다." : "모범 풀이의 단계입니다. 본인 풀이와 비교해 보세요.",
                           errorType: nil)
            },
            awardedPoints: ok ? 4 : 0,
            feedback: ok
                ? "정답입니다. 같은 유형이 GOAT Arena에 다른 수치로 다시 나옵니다."
                : "정답이 아닙니다. 아래 모범 풀이의 단계와 본인 풀이가 어디서 갈라지는지 찾아보세요. 정답은 알려드리지 않습니다.",
            confidence: 1.0,
            needsHumanReview: false
        )
    }

    /// 다음 문항으로. 마지막이면:
    ///  개념에서 온 세트 → 그 개념을 완료 처리하고 커리큘럼으로 (진도가 나간다)
    ///  복습 세트       → 오답노트로
    ///  평가센터 세트   → 평가센터로
    func advanceExam() {
        if examIndex + 1 < exam.count {
            examIndex += 1
            route = .solve
        } else {
            // 확인 문항이 끝났다 — 기록을 남기지 않는 것이 규약이므로 최고 기록 갱신
            // **전에** 빠져나가고(1문항 100점이 최고 기록으로 남으면 안 된다),
            // 접어 뒀던 복습 세트를 그대로 펴서 원래 자리에서 이어 푼다.
            if isVariationCheck {
                isVariationCheck = false
                guard let saved = pendingReview else {
                    // 복습 밖에서 시작된 확인 문항 — 조용히 오답노트로
                    exam = []
                    examIndex = 0
                    examResults = []
                    route = .wrongNotes
                    return
                }
                pendingReview = nil
                exam = saved.exam
                examIndex = saved.index
                reviewingNoteIDs = saved.noteIDs
                examResults = saved.results
                examStartedAt = saved.startedAt
                lastExamSeed = saved.seed
                solveStartedAt = Date()     // 확인 문항에 쓴 시간이 다음 복습 문항의 풀이시간이 되면 안 된다
                // 확인하러 새지 않고 "다음" 을 눌렀을 때와 똑같이 이어간다.
                // (isVariationCheck 를 이미 내렸으므로 재귀는 여기서 한 번뿐이다)
                advanceExam()
                return
            }

            // 시험 기록 — 점수(백분율)와 소요 시간. 랭킹 "내 기록" 의 근거.
            if !examResults.isEmpty {
                let score = Int((Double(examResults.filter { $0 }.count)
                                 / Double(examResults.count) * 100).rounded())
                let elapsed = examStartedAt.map { Int(Date().timeIntervalSince($0) * 1000) } ?? 0
                if score > bestScore || (score == bestScore && elapsed < bestElapsedMs) {
                    bestScore = score
                    bestElapsedMs = elapsed
                    UserDefaults.standard.set(score, forKey: AppStore.slotKey("matths.bestScore"))
                    UserDefaults.standard.set(elapsed, forKey: AppStore.slotKey("matths.bestMs"))
                }
            }

            let wasReview = reviewingNoteIDs != nil
            exam = []
            reviewingNoteIDs = nil
            if examSourceConceptV2ID != nil {
                // v2 연습 세트 — 자동 완료 없음(유형 게이트가 완료를 다스린다).
                // 개념 화면으로 돌아가 적립된 유형·진도%를 보여준다.
                examSourceConceptV2ID = nil
                route = .concept
            } else {
                route = wasReview ? .wrongNotes : .assess
            }
        }
    }

    // MARK: 평가 v2 — 웹 규칙 시험지 (AssessmentV2.swift)

    @Published var attemptsV2: AttemptStoreV2 = .load()
    @Published var currentAttemptID: String?
    @Published var assessmentSyncError: String?
    @Published private(set) var assessmentSubmitting = false
    private var assessmentStartGeneration = UUID()
    private var assessmentDraftTask: Task<Void, Never>?

    var currentAttempt: AssessmentAttemptV2? {
        currentAttemptID.flatMap { id in attemptsV2.attempts.first { $0.id == id } }
    }

    /// 시험지 시작 — 문항을 확정 저장하고(웹 AssessmentAttempt) 응시 화면으로.
    func startPaper(scope: PaperScope, course: AssessCourse,
                    unit: AssessUnit? = nil, subunit: AssessSubunit? = nil) {
        if ServerAPI.hasToken {
            let generation = UUID()
            assessmentStartGeneration = generation
            let slot = DataScope.slot
            assessmentSyncError = nil
            Task { [weak self] in
                await self?.startServerPaper(
                    scope: scope, course: course, unit: unit, subunit: subunit,
                    generation: generation, accountSlot: slot)
            }
            return
        }
        startLocalPaper(scope: scope, course: course, unit: unit, subunit: subunit)
    }

    private func startLocalPaper(scope: PaperScope, course: AssessCourse,
                                 unit: AssessUnit? = nil, subunit: AssessSubunit? = nil) {
        let scopeKey = "\(scope.rawValue)/\(course.courseId)/\(unit?.unitId ?? "-")/\(subunit?.id ?? "-")"
        // 평가센터가 "진행 중"이라고 표시한 회차는 새로 뽑지 말고 실제 저장 답안으로
        // 돌아간다. 종전에는 같은 CTA가 매번 새 AssessmentAttempt를 만들어
        // "이어서 응시"가 사실상 데이터 유실 버튼이었다.
        if let open = attemptsV2.openAttempt(scopeKey: scopeKey) {
            currentAttemptID = open.id
            route = .paper
            return
        }
        let title: String
        switch scope {
        case .subunit: title = "「\(subunit?.title ?? "")」 중간평가"
        case .unit:    title = "「\(unit?.title ?? "")」 기말평가"
        case .course:  title = "「\(course.title)」 과목 종합평가"
        }
        // 심화 템플릿의 스테이지 선택 근거 — 이 과목의 완료 개념 (웹 learnedConceptIds)
        let learned = CurriculumV2.course(course.courseId)?.allConcepts
            .filter { progressV2.percent(for: $0) >= 100 }.map(\.id) ?? []
        let questions = PaperFactory.make(
            scope: scope, course: course, unit: unit, subunit: subunit,
            seed: UInt64(Date().timeIntervalSince1970),
            avoid: attemptsV2.avoidedTypeKeys(scopeKey: scopeKey),
            learned: learned)
        guard !questions.isEmpty else { return }
        let attempt = AssessmentAttemptV2(
            id: UUID().uuidString, scope: scope, courseId: course.courseId,
            unitId: unit?.unitId, subunitId: subunit?.id, title: title,
            questions: questions, answers: Array(repeating: "", count: questions.count),
            submittedAt: nil, scorePercent: nil, passed: nil, createdAt: Date(),
            // 제한 시간을 **시작할 때 박아 둔다** — 레포와 같은 값(10/30/60분).
            timeLimitMs: AssessTimeLimit.ms(for: scope.rawValue), disqualified: false)
        attemptsV2.upsert(attempt)
        attemptsV2.save()
        currentAttemptID = attempt.id
        route = .paper
    }

    private func startServerPaper(scope: PaperScope, course: AssessCourse,
                                  unit: AssessUnit?, subunit: AssessSubunit?,
                                  generation: UUID, accountSlot: String) async {
        do {
            let remote = try await ServerAPI.startAssessment(
                scope: scope, courseId: course.courseId, unitId: unit?.unitId,
                subunitId: subunit?.id, clientStartId: generation.uuidString)
            guard generation == assessmentStartGeneration,
                  accountSlot == DataScope.slot,
                  let attempt = remote.localValue() else { return }
            attemptsV2.upsert(attempt)
            attemptsV2.save()
            currentAttemptID = attempt.id
            route = .paper
        } catch {
            guard generation == assessmentStartGeneration,
                  accountSlot == DataScope.slot else { return }
            assessmentSyncError = (error as? ServerAPIError)?.errorDescription
                ?? "평가를 시작하지 못했습니다. 연결을 확인하고 다시 시도해주세요."
        }
    }

    func pullServerAssessments() async {
        guard ServerAPI.hasToken else { return }
        let slot = DataScope.slot
        do {
            let values = try await ServerAPI.assessmentSnapshot().compactMap { $0.localValue() }
            guard slot == DataScope.slot else { return }
            attemptsV2.replaceServerSnapshot(values)
            attemptsV2.save()
            objectWillChange.send()
        } catch {
            guard slot == DataScope.slot else { return }
            assessmentSyncError = (error as? ServerAPIError)?.errorDescription
                ?? "평가 기록을 동기화하지 못했습니다."
        }
    }

    func setPaperAnswer(no: Int, value: String) {
        guard var a = currentAttempt, a.submittedAt == nil,
              no >= 1 && no <= a.answers.count else { return }
        a.answers[no - 1] = value
        attemptsV2.upsert(a)
        attemptsV2.save()
        if a.serverBacked == true { scheduleAssessmentDraft(a) }
    }

    private func scheduleAssessmentDraft(_ attempt: AssessmentAttemptV2) {
        assessmentDraftTask?.cancel()
        let slot = DataScope.slot
        assessmentDraftTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(650))
            guard !Task.isCancelled, slot == DataScope.slot else { return }
            do {
                try await ServerAPI.saveAssessmentDraft(
                    id: attempt.id, answers: AssessmentSyncPayload.answers(for: attempt))
            } catch {
                guard slot == DataScope.slot else { return }
                self?.assessmentSyncError = (error as? ServerAPIError)?.errorDescription
                    ?? "평가 답안을 서버에 저장하지 못했습니다. 기기에는 보관했습니다."
            }
        }
    }

    func flushAssessmentDraft() {
        assessmentDraftTask?.cancel()
        guard let attempt = currentAttempt, attempt.submittedAt == nil,
              attempt.serverBacked == true else { attemptsV2.save(); return }
        let slot = DataScope.slot
        Task { [weak self] in
            do {
                try await ServerAPI.saveAssessmentDraft(
                    id: attempt.id, answers: AssessmentSyncPayload.answers(for: attempt))
            } catch {
                guard slot == DataScope.slot else { return }
                self?.assessmentSyncError = (error as? ServerAPIError)?.errorDescription
                    ?? "평가 답안을 서버에 저장하지 못했습니다. 기기에는 보관했습니다."
            }
        }
    }

    /// 제출 — 웹 규칙: 균등 배점 100점, PASS 80. 오답은 오답노트에도 적재(앱 강점 유지).
    /// 시험 제출.
    ///
    /// `monotonicElapsed` 는 ExamTimer 가 잰 단조 경과(초). 기기 시각 조작을
    /// 막기 위해 월클럭과 함께 본다 — 자세한 이유는 `remainingSeconds` 주석.
    func submitPaper(monotonicElapsed: TimeInterval = 0) {
        guard let current = currentAttempt, current.submittedAt == nil else { return }
        if current.serverBacked == true, ServerAPI.hasToken {
            guard !assessmentSubmitting else { return }
            let slot = DataScope.slot
            assessmentSubmitting = true
            assessmentDraftTask?.cancel()
            Task { [weak self] in
                await self?.submitServerPaper(
                    current, monotonicElapsed: monotonicElapsed, accountSlot: slot)
            }
            return
        }
        submitLocalPaper(monotonicElapsed: monotonicElapsed)
    }

    private func submitServerPaper(_ attempt: AssessmentAttemptV2,
                                   monotonicElapsed: TimeInterval,
                                   accountSlot: String) async {
        defer { if accountSlot == DataScope.slot { assessmentSubmitting = false } }
        do {
            let payload = AssessmentSyncPayload.answers(for: attempt)
            let remote: ServerAPI.RemoteAssessment
            if attempt.remainingSeconds(monotonicElapsed: monotonicElapsed) <= 0 {
                remote = try await ServerAPI.expireAssessment(id: attempt.id, answers: payload)
            } else {
                remote = try await ServerAPI.submitAssessment(id: attempt.id, answers: payload)
            }
            guard accountSlot == DataScope.slot,
                  let updated = remote.localValue() else { return }
            attemptsV2.upsert(updated)
            attemptsV2.save()
            currentAttemptID = updated.id
            assessmentSyncError = nil
            await SyncEngine.shared.pullWrongNotes()
        } catch {
            guard accountSlot == DataScope.slot else { return }
            assessmentSyncError = (error as? ServerAPIError)?.errorDescription
                ?? "평가를 제출하지 못했습니다. 답안은 기기에 보관되어 있습니다."
        }
    }

    private func submitLocalPaper(monotonicElapsed: TimeInterval = 0) {
        guard var a = currentAttempt, a.submittedAt == nil else { return }

        // **시간이 지났으면 0점 실격이다.** 레포는 이때 status="disqualified",
        // reason="time-limit", earnedPoints=0 으로 저장한다. 앱에는 이 처리가
        // 아예 없어서, 몇 시간이 걸려도 정상 점수가 나왔다 —
        // 같은 시험을 앱에서 보는 쪽이 더 유리했다.
        if a.remainingSeconds(monotonicElapsed: monotonicElapsed) <= 0 {
            a.disqualified = true
            a.scorePercent = 0
            a.passed = false
            a.submittedAt = Date()
            attemptsV2.upsert(a)
            attemptsV2.save()
            return
        }

        let result = PaperFactory.grade(questions: a.questions, answers: a.answers)
        a.scorePercent = result.scorePercent
        a.passed = result.scorePercent >= AssessCatalog.data.passScore
        a.submittedAt = Date()
        attemptsV2.upsert(a)
        attemptsV2.save()

        let correctCount = result.verdicts.filter { $0 }.count
        let elapsedMs = monotonicElapsed > 0
            ? Int((monotonicElapsed * 1_000).rounded()) : nil
        EventLog.appendGrading(
            correct: correctCount,
            total: a.questions.count,
            durationMs: elapsedMs)
        SyncEngine.shared.enqueueGradingEvents(
            correct: correctCount,
            total: a.questions.count,
            durationMs: elapsedMs)
        solvedTotal += a.questions.count
        correctTotal += correctCount
        UserDefaults.standard.set(solvedTotal, forKey: AppStore.slotKey("matths.solved"))
        UserDefaults.standard.set(correctTotal, forKey: AppStore.slotKey("matths.correct"))
        activityDays = ActivityLog.recordToday()

        for (i, q) in a.questions.enumerated() where !result.verdicts[i] {
            let pid = "paper-\(a.id)-\(q.no)"
            if wrongNotes.contains(where: { $0.problemID == pid }) { continue }
            wrongNotes.insert(WrongNoteEntry(
                id: UUID().uuidString, problemID: pid, typeKey: q.typeKey,
                typeName: a.title, unit: "평가 · \(a.title)",
                statement: q.prompt, answer: q.answer,
                // 해설이 비어 있으면 "평가 결과 화면에서 보라" 고 안내했었는데, 제출한
                // 시험지를 다시 여는 진입점이 앱에 없다 — 도달 못 하는 화면을 가리키는
                // 안내는 없느니만 못하다. 없는 것은 없다고 말한다 (2026-07-29 감사 적발).
                steps: q.solution.isEmpty
                    ? ["이 문항은 모범 풀이가 제공되지 않습니다. 정답과 대조하며 풀이를 다시 확인해 보세요."]
                    : [q.solution],
                seed: 0, divergenceStep: nil, drawingPNGBase64: nil,
                srsStage: 0, nextReviewAt: Date(), wrongCount: 1, createdAt: Date(),
                choices: q.choices, isTex: true
            ), at: 0)
            // 평가 오답도 서버로 올린다. 이 한 줄이 없어서 로그인 이후 생긴 평가
            // 오답만 영영 안 올라갔다 — 기출 경로에서 이미 같은 구멍을 메웠는데
            // 평가 경로에만 남아 있었다(2026-07-29 감사 적발).
            if let fresh = wrongNotes.first { SyncEngine.shared.enqueueWrongNote(fresh) }
        }
        WrongNoteDisk.save(wrongNotes)
        objectWillChange.send()
    }

    /// 과목 종합평가 통과 여부 — 진도 95% 캡의 근거 (웹 applyAssessmentGates)
    func coursePassedV2(_ webCourseID: String) -> Bool {
        attemptsV2.passed(scopeKey: "course/\(webCourseID)/-/-")
    }

    /// 표시용 과목 진도 — 개념을 다 끝내도 종합평가 미통과면 95 에서 멈춘다
    func displayCoursePercent(_ course: CourseV2) -> Int {
        let p = progressV2.coursePercent(course)
        if p >= 100 && AssessCatalog.course(course.id) != nil && !coursePassedV2(course.id) {
            return 95
        }
        return p
    }

    // MARK: 기출 (KICE) — 3개년 수능 실전 문제지 (KiceBank.swift)

    /// 응시 중인 기출 시험 id
    @Published var kiceExamID: String?
    /// 시험별 입력 답안 (examID → "구간-문항" → 입력). 나갔다 돌아와도 유지된다.
    @Published var kiceAnswers: [String: [String: String]] = [:]
    /// 시험별 선택과목 (examID → 과목명)
    @Published var kiceSubject: [String: String] = [:]

    var kiceExam: KiceExam? {
        kiceExamID.flatMap { id in KiceBank.exams.first { $0.id == id } }
    }

    func startKice(_ exam: KiceExam) {
        kiceExamID = exam.id
        route = .kice
    }

    // MARK: 오늘의 학습 계획 (웹 DailyPlan — 로컬 생성)

    @Published var dailyPlan: DailyPlanV1?

    /// 오늘 계획 로드/생성 — 복습 due → 이어서 학습 → 유형 게이트 순으로 최대 3개
    func ensureDailyPlan() {
        let key = ActivityLog.dayString()
        if let existing = dailyPlan, existing.dateKey == key { return }
        if let saved = DailyPlanStore.load(dateKey: key) { dailyPlan = saved; return }

        var tasks: [DailyPlanTask] = []
        if dueReviewCount > 0 {
            tasks.append(DailyPlanTask(id: "review", kind: "review",
                title: "오답 \(dueReviewCount)문항 복습", estimatedMinutes: dueReviewCount * 4, done: false))
        }
        if let (course, _, con) = progressV2.continueConcept() {
            tasks.append(DailyPlanTask(id: "concept-\(con.id)", kind: "concept",
                title: "\(course.title) · \(con.title) 학습",
                estimatedMinutes: con.lesson?.estimatedMinutes ?? 15, done: false))
            let required = progressV2.requiredDistinctTypes(for: con)
            let got = progressV2.byConcept[con.id]?.correctTypeIds.count ?? 0
            if required > 0 && got < required {
                tasks.append(DailyPlanTask(id: "practice-\(con.id)", kind: "practice",
                    title: "유형 게이트 채우기 (\(got)/\(required))", estimatedMinutes: 10, done: false))
            }
        }
        let plan = DailyPlanV1(dateKey: key, tasks: tasks)
        dailyPlan = plan
        DailyPlanStore.save(plan)
    }

    func togglePlanTask(_ id: String) {
        guard var plan = dailyPlan,
              let i = plan.tasks.firstIndex(where: { $0.id == id }) else { return }
        plan.tasks[i].done.toggle()
        dailyPlan = plan
        DailyPlanStore.save(plan)
    }

    /// 웹 로컬 생성기 연습 — 네이티브 유형이 없는 개념의 STEP04 (웹 practiceService)
    func startWebPractice(_ concept: ConceptV2) {
        guard let (course, unit, _) = CurriculumV2.concept(concept.id) else { return }
        let seed = UInt64(Date().timeIntervalSince1970 * 1_000)
        let problems = WebGen.practiceProblems(
            courseId: course.id, unitId: unit.id, conceptId: concept.id,
            count: 5, seed: seed,
            includeCurriculumChecks: true)
        guard !problems.isEmpty else { return }
        // 문항을 만든 시드와 오답·이의제기에 기록할 시드는 반드시 같아야 한다.
        // 직전 세션의 lastExamSeed를 넘기면 재현 시 전혀 다른 문제가 생성된다.
        startExam(problems: problems, seed: seed)
        examSourceConceptV2ID = concept.id      // startExam 이 초기화하므로 반드시 뒤에
    }

    /// 기출 채점 후 실데이터 반영 — 누적 통계·학습일·최고점·오답노트 적재.
    /// 오답노트 항목은 문제 본문 대신 "문제지 PDF 로 다시 풀라" 는 지시문을 담는다
    /// (기출 발제문은 저작물이라 앱 텍스트로 복제하지 않는다).
    func recordKice(exam: KiceExam, score: Int, correct: Int, total: Int,
                    elapsedMs: Int,
                    wrong: [(KiceItem, String, String)]) {
        EventLog.appendGrading(correct: correct, total: total, durationMs: elapsedMs)
        SyncEngine.shared.enqueueGradingEvents(
            correct: correct, total: total, durationMs: elapsedMs)
        solvedTotal += total
        correctTotal += correct
        UserDefaults.standard.set(solvedTotal, forKey: AppStore.slotKey("matths.solved"))
        UserDefaults.standard.set(correctTotal, forKey: AppStore.slotKey("matths.correct"))
        activityDays = ActivityLog.recordToday()
        KiceBank.recordScore(exam.id, score: score)

        let choiceKeys = ["a", "b", "c", "d", "e"]
        for (item, section, myInput) in wrong {
            let pid = "\(exam.id)-\(section)-\(item.no)"
            if let i = wrongNotes.firstIndex(where: { $0.problemID == pid && !$0.isMastered }) {
                WrongNoteSRS.afterWrong(&wrongNotes[i])
                // 이번 회차에 쓴 답으로 갱신 — 진단은 "가장 최근에 뭘 썼는지" 를 본다
                if !myInput.isEmpty { wrongNotes[i].myAnswer = myInput }
                SyncEngine.shared.enqueueReviewResult(wrongNotes[i], correct: false)
            } else {
                wrongNotes.insert(WrongNoteEntry(
                    id: UUID().uuidString, problemID: pid, typeKey: "kice-\(exam.id)",
                    typeName: "\(exam.short) \(section) \(item.no)번",
                    unit: "기출 · \(exam.short)",
                    statement: "『\(exam.title)』 수학 영역\(exam.displayForm.map { "(\($0))" } ?? "") \(section) \(item.no)번 · \(item.points)점 문항입니다. 평가센터의 기출에서 문제지 PDF를 열어 다시 풀어보세요.",
                    // 선다는 SolveScreen 의 5지선다 키(a~e), 단답은 숫자 그대로
                    answer: item.isChoice ? choiceKeys[(Int(item.answer) ?? 1) - 1] : item.answer,
                    steps: ["기출 문항은 앱이 모범 풀이를 제공하지 않습니다. 문제지 PDF로 다시 푼 뒤, 해설이 필요하면 EBSi 무료 해설 강의를 참고하세요."],
                    seed: 0, divergenceStep: nil, drawingPNGBase64: nil,
                    srsStage: 0, nextReviewAt: Date(),   // 최초 복습은 당일
                    wrongCount: 1, createdAt: Date(),
                    // 발제문 없는 선다 복습용 — 빈 텍스트 선지는 ①~⑤ 버블만 그린다
                    choices: item.isChoice ? ["", "", "", "", ""] : nil,
                    isTex: item.isChoice,
                    // 그때 학생이 쓴 답 — 없으면 AI 진단이 무엇이 어긋났는지 못 짚는다
                    myAnswer: myInput.isEmpty ? nil : myInput
                ), at: 0)
                // 기출 오답도 서버 오답노트에 올린다. 여기만 배선이 빠져 있어서
                // 로그인 이후에 생긴 기출 오답은 기기를 바꾸면 통째로 사라졌다
                // (로그인 순간의 스냅샷 1회 업로드에만 얹혀 있었다 — 감사 적발).
                if let fresh = wrongNotes.first { SyncEngine.shared.enqueueWrongNote(fresh) }
            }
        }
        WrongNoteDisk.save(wrongNotes)
    }

    /// 결과 화면에서 고른 "틀린 이유"(7종) — 방금 적재된 오답 항목에 기록 (웹 errorType)
    func setErrorType(_ type: WrongErrorType) {
        guard let p = currentProblem,
              let idx = wrongNotes.firstIndex(where: { $0.problemID == p.id && !$0.isMastered })
        else { return }
        wrongNotes[idx].errorType = type.rawValue
        WrongNoteDisk.save(wrongNotes)
        objectWillChange.send()
    }

    /// 복습 통과 직후 "같은 유형 새 수치" 확인 1문항 (웹 변형 재출제의 앱판).
    /// 기록 목적이 아니라 확인 목적 — 통계·오답노트·학습 이벤트를 남기지 않고,
    /// 끝나면 풀던 복습 세트로 그대로 돌아간다.
    func startVariationCheck(typeKey: String) {
        guard let type = ProblemType(rawValue: typeKey) else { return }
        // startExam 이 exam·복습 큐를 통째로 갈아치우므로 되돌릴 것을 먼저 손에 쥔다.
        // (예전에는 여기서 due 5문항짜리 복습 세트가 통째로 증발했다 — 감사 적발)
        let saved = reviewingNoteIDs.map {
            PendingReview(exam: exam, index: examIndex, noteIDs: $0,
                          results: examResults, startedAt: examStartedAt, seed: lastExamSeed)
        }
        startExam(types: [type], count: 1)
        // startExam 이 두 값을 지우므로 반드시 뒤에서 세운다
        pendingReview = saved
        isVariationCheck = true
    }

    /// 결과 화면에서 "갈라진 단계" 를 짚으면 방금 적재된 오답 항목에 기록한다.
    func setDivergence(_ step: Int) {
        divergenceStep = step
        guard let p = currentProblem,
              let idx = wrongNotes.firstIndex(where: { $0.problemID == p.id && !$0.isMastered })
        else { return }
        wrongNotes[idx].divergenceStep = step
        WrongNoteDisk.save(wrongNotes)
    }

    init() {
        // 인증 진실원 화해 (S-02) — 로그인 상태의 진실원은 authProvider(UserDefaults)다.
        // iOS 키체인은 앱을 삭제해도 살아남고 UserDefaults 는 지워지므로, 재설치 후
        // "게스트로 둘러보기" 를 누른 기기에 이전 계정의 Bearer 토큰이 남을 수 있다.
        // 그대로 두면 게스트의 학습 op 가 이전 계정으로 올라가고, 이전 계정의 오답·진도가
        // 게스트 슬롯으로 내려온다 — 양방향 계정 간 오염. 서버 계정이 아닌데 토큰이
        // 있으면 잘못 남은 것이니 폐기한다 (SyncEngine 의 정체성 게이트와 짝).
        switch ServerTokenOwnership.restoredSessionAction(
            authProvider: authProvider,
            hasToken: ServerAPI.hasToken) {
        case .keep:
            break
        case .discardOrphanedToken:
            ServerAPI.logout()
            NSLog("AUTH-RECONCILE 잔존 키체인 토큰 폐기 (authProvider=%@, slot=%@)",
                  authProvider ?? "nil", DataScope.slot)
        case .requireSignIn:
            authProvider = nil
            UserDefaults.standard.removeObject(forKey: "matths.auth")
            _ = DataScope.switchTo(DataScope.slotName(forEmail: nil))
            authenticationNotice = "로그인이 만료되었습니다. 다시 로그인해주세요."
            NSLog("AUTH-RECONCILE 서버 로그인 표식에 대응하는 키체인 토큰 없음")
        }
        // 프로필 슬롯 전환 전 버전에서 남은 전역 값을 현재 서버 계정으로 무손실 이관한
        // 뒤, 아래 reload 가 모든 메모리 캐시를 한 슬롯의 값으로 맞춘다.
        Self.migrateLegacyProfileIfNeeded()
        reloadLocalData()

        authenticationExpiredObserver = NotificationCenter.default.addObserver(
            forName: .matthsServerAuthenticationExpired,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            Task { @MainActor in
                guard let self, self.authProvider == "server" else { return }
                let serverMessage = String(
                    notification.userInfo?["message"] as? String ?? "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                self.signOut()
                self.authenticationNotice = serverMessage.isEmpty
                    ? "로그인이 만료되었습니다. 다시 로그인해주세요."
                    : serverMessage
            }
        }

        // 학년 자동 승급 — 3월 1일(KST) 학년도 기준, 학년도당 1회 (웹 생애주기 규칙)
        let promotionKey = AppStore.slotKey("matths.gradePromoYear")
        let lastPromo = UserDefaults.standard.object(forKey: promotionKey) as? Int
        let promoted = AcademicYear.promote(grade: schoolGrade, lastPromotionYear: lastPromo)
        if promoted.grade != schoolGrade { schoolGrade = promoted.grade }
        UserDefaults.standard.set(promoted.year, forKey: promotionKey)

        #if DEBUG
        // 스크린샷 검증용 시작 화면 지정: -route assess
        // 릴리스 빌드에는 들어가지 않는다.
        let args = ProcessInfo.processInfo.arguments
        // 자동화 실행(-route/-exam/-harness)은 로그인 게이트를 게스트로 통과시킨다
        if args.contains("-route") || args.contains("-exam") || args.contains("-harness") {
            authProvider = authProvider ?? "guest"
        }
        // 오답노트 연출: -seedWrong n — **실제 채점 경로**로 n개를 틀려서 적재한다.
        // (가짜 데이터 주입이 아니라 gradeCurrent → 오답 적재 → SRS 초기화까지
        //  실코드가 도는지 함께 검증된다. -route 보다 먼저 돌고 route 는 아래서 덮는다.)
        if let i = args.firstIndex(of: "-seedWrong"), i + 1 < args.count,
           let n = Int(args[i + 1]), wrongNotes.isEmpty {
            startExam(types: ProblemType.allCases, count: n, seed: 7)
            for _ in 0..<n {
                gradeCurrent(input: "DEBUG-WRONG")
                advanceExam()
            }
        }
        if let i = args.firstIndex(of: "-route"), i + 1 < args.count,
           let r = Route.allCases.first(where: { "\($0)" == args[i + 1] }) {
            route = r
        }
        // 동적 모의고사 바로 시작: -exam [시드]. 스크린샷·수동 검증용.
        if let i = args.firstIndex(of: "-exam") {
            let seed = i + 1 < args.count ? UInt64(args[i + 1]) : nil
            startExam(types: [.extremum, .logEq, .counting, .integral],
                      count: 4, seed: seed)
        }
        // 진도 연출: -complete n — 커리큘럼 순서대로 앞 n개를 완료 상태에 **병합**한다.
        // 교체(=)로 짰다가 사용자가 직접 딴 진도를 지워 먹은 사고가 있었다.
        // 디버그 인자는 사용자 데이터를 절대 파괴하면 안 된다.
        if let i = args.firstIndex(of: "-complete"), i + 1 < args.count,
           let n = Int(args[i + 1]) {
            let all = CurriculumV2.data.courses.flatMap(\.allConcepts).prefix(n)
            for concept in all {
                progressV2.mergeDebugCompletion(concept)
                if let appID = concept.legacy?.appId {
                    completedConceptIDs.insert(appID)
                }
            }
            saveProgressV2()
            Progress.save(completedConceptIDs)
        }
        // 계정 상태 초기화: -signOut — 키체인 토큰 + 로그인 상태만 지운다.
        // 학습 데이터(진도·오답)는 건드리지 않는다 (데이터 파괴 금지 원칙).
        if args.contains("-signOut") {
            signOut()
        }
        // 오답 AI 진단(thinking) 완주 검증: -diagnoseFirst — 첫 오답노트에 대해
        // 오답노트의 "AI 진단" 버튼과 동일한 실코드 경로를 탭 없이 실행한다.
        // (시뮬 런타임의 HID 주입이 막힌 환경에서 자동 검증용. 데이터 비파괴 —
        //  기존 노트를 읽기만 하고 결과는 채팅 스트림에만 출력된다.)
        if args.contains("-diagnoseFirst"), let note = wrongNotes.first {
            route = .chat
            AITutor.shared.discoverAndLoad()
            AITutor.shared.analyze(
                statement: note.statement,
                myAnswer: note.myAnswer,
                correctAnswer: note.answer,
                steps: note.steps,
                errorType: note.errorType,
                divergenceStep: note.divergenceStep,
                coachLevel: coach.level)
        }
        // 뱅크 시험 연출: -bankexam [시드] — 대수 지수로그 대단원 8문항
        if let i = args.firstIndex(of: "-bankexam") {
            let seed = (i + 1 < args.count ? UInt64(args[i + 1]) : nil) ?? 42
            let problems = JSBank.unitExam(course: "algebra", unit: "explog", seed: seed)
            startExam(problems: problems, seed: seed)
        }
        // 평가 시험지 직행(잠금 우회): -paper <과목 id> [subunit|unit|course]
        if let i = args.firstIndex(of: "-paper"), i + 1 < args.count,
           let course = AssessCatalog.course(args[i + 1]),
           let unit = course.units.first, let sub = unit.subunits.first {
            let scope = i + 2 < args.count ? PaperScope(rawValue: args[i + 2]) ?? .subunit : .subunit
            switch scope {
            case .subunit: startPaper(scope: .subunit, course: course, unit: unit, subunit: sub)
            case .unit:    startPaper(scope: .unit, course: course, unit: unit)
            case .course:  startPaper(scope: .course, course: course)
            }
        }
        // v2 개념 직행: -conceptv2 <웹 개념 id>  예) -conceptv2 calculus-1-01-01
        if let i = args.firstIndex(of: "-conceptv2"), i + 1 < args.count {
            openConceptV2(args[i + 1])
        }
        // 기출 직행: -kice [시험id]  예) -kice suneung-2026. id 생략 시 첫 시험.
        if let i = args.firstIndex(of: "-kice") {
            let id = i + 1 < args.count && !args[i + 1].hasPrefix("-") ? args[i + 1] : nil
            if let exam = KiceBank.exams.first(where: { $0.id == id }) ?? KiceBank.exams.first {
                startKice(exam)
            }
        }
        // 코치 상태 연출: -coach <수위>.<상황>  예) -coach hell.wrong2
        if let i = args.firstIndex(of: "-coach"), i + 1 < args.count {
            let parts = args[i + 1].split(separator: ".")
            if parts.count == 2, let lv = SpiceLevel(rawValue: String(parts[0])) {
                coach.level = lv
                switch parts[1] {
                case "wrong1":       coachLine = coach.onWrong()
                case "wrong2":       _ = coach.onWrong(); coachLine = coach.onWrong()
                case "wrong3":       _ = coach.onWrong(); _ = coach.onWrong(); coachLine = coach.onWrong()
                case "correct":      coachLine = coach.onCorrect()
                case "correctRetry": _ = coach.onWrong(); coachLine = coach.onCorrect()
                default: break
                }
            }
        }
        #endif
    }

    func recordStuckPoint(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let record = StuckPointRecord(text: String(trimmed.prefix(500)))
        stuckPoints.insert(record, at: 0)
        StuckPointsDisk.save(stuckPoints)   // 즉시 영속 — 앱을 꺼도 남는다
        SyncEngine.shared.enqueueStuckPoint(record)
    }

    /// 세션 모드 — 문제 푸는 동안은 상·하단 바를 모두 걷어낸다
    var isSessionMode: Bool {
        route == .solve || route == .result || route == .kice || route == .paper || route == .placement || route == .weeklyMock
    }

    /// 하단 탭바에서 어느 항목을 켜 둘지.
    /// 개념 화면은 탭이 아니지만 커리큘럼에서 들어온 곳이므로 그 탭을 켠다.
    /// (아무 탭도 안 켜져 있으면 학생은 자기가 어디 있는지 알 수 없다.)
    var selectedTab: Route {
        switch route {
        case .concept: return .curriculum
        case .placement, .arenaShop: return .rank
        case .weeklyMock: return .assess
        default:       return route
        }
    }

    /// Arena의 하위 화면도 같은 독립 다크 셸과 선택 탭을 유지한다.
    var isArenaRoute: Bool {
        route == .rank || route == .arenaShop
    }
}

// MARK: - 복습 리마인더 (로컬 알림)

/// 프로필의 "복습 리마인더" 를 실제로 울리게 하는 곳.
///
/// APNs·서버 잡 없이 **기기 로컬 알림**만 쓴다 — 엔타이틀먼트도, 백그라운드 모드도,
/// 디바이스 토큰도 필요 없고 오프라인에서도 뜬다. 이 앱에 필요한 건 그게 전부다.
///
/// 매일 울리는 반복 알림 대신 오답의 nextReviewAt 이 실제로 걸린 날만 예약한다 —
/// 화면이 "복습 예정 문항이 있는 날 저녁" 이라고 약속했기 때문이다.
enum ReviewReminder {
    /// 우리가 건 예약만 골라 지우기 위한 식별자 접두사
    private static let prefix = "matths.review."
    /// 저녁 8시 — 화면 문구의 "저녁"
    private static let hour = 20
    /// 앞으로 며칠까지 미리 걸어 둘지 (복습 목록이 바뀔 때마다 다시 계산한다)
    private static let horizonDays = 7

    /// 예약을 현재 오답 목록에 맞춰 다시 건다.
    /// - Parameter onAuthorization: 권한 응답. 거부되면 호출부가 토글을 되돌린다
    ///   (알림이 오지 않는데 켜져 있는 토글은 거짓말이다).
    static func reschedule(_ notes: [WrongNoteEntry], onAuthorization: ((Bool) -> Void)? = nil) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            onAuthorization?(granted)
            guard granted else { return }
            clearMine(center) {
                for request in requests(for: notes) { center.add(request) }
            }
        }
    }

    /// 토글을 끄면 걸어 둔 예약을 모두 회수한다 (남의 알림은 건드리지 않는다)
    static func cancelAll() {
        clearMine(UNUserNotificationCenter.current())
    }

    private static func clearMine(_ center: UNUserNotificationCenter,
                                  then next: (() -> Void)? = nil) {
        center.getPendingNotificationRequests { pending in
            let mine = pending.map(\.identifier).filter { $0.hasPrefix(prefix) }
            center.removePendingNotificationRequests(withIdentifiers: mine)
            next?()
        }
    }

    /// 앞으로 horizonDays 일 중, 그날 저녁까지 복습이 걸린 오답이 있는 날만 예약한다.
    private static func requests(for notes: [WrongNoteEntry]) -> [UNNotificationRequest] {
        let calendar = Calendar.current
        var out: [UNNotificationRequest] = []
        for offset in 0..<horizonDays {
            guard let day = calendar.date(byAdding: .day, value: offset, to: Date()) else { continue }
            var comps = calendar.dateComponents([.year, .month, .day], from: day)
            comps.hour = hour
            comps.minute = 0
            // 이미 지난 오늘 저녁에는 걸지 않는다 (트리거가 조용히 버려진다)
            guard let fireAt = calendar.date(from: comps), fireAt > Date() else { continue }
            let due = notes.filter { note in
                guard let next = note.nextReviewAt else { return false }   // nil = 졸업
                return next <= fireAt
            }.count
            guard due > 0 else { continue }

            let content = UNMutableNotificationContent()
            content.title = "오늘의 복습"
            content.body = "복습할 오답이 \(due)문항 있습니다."
            content.sound = .default
            // 식별자는 날짜 성분으로 직접 만든다 — 예약은 백그라운드 콜백에서 돌고,
            // 공용 DateFormatter 를 그 스레드로 끌고 가지 않는 편이 안전하다.
            let key = "\(comps.year ?? 0)-\(comps.month ?? 0)-\(comps.day ?? 0)"
            out.append(UNNotificationRequest(
                identifier: prefix + key,
                content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
        }
        return out
    }
}

// MARK: - 막힌 지점 저장 (스크린샷 가드 입력)

/// 스크린샷 가드에서 학생이 직접 적은 "막힌 지점" 의 슬롯 파일 저장소.
/// WrongNoteDisk 와 같은 관례(슬롯 스코프 JSON)를 따르되, 손상 시 원본을 보존한다 —
/// 손상 1건이 전체 유실로 증폭되면 안 된다(빈 배열로 덮어쓰는 순간 복구 불능이 된다).
enum StuckPointsDisk {
    private static var fileURL: URL { DataScope.url("stuck-points.json") }

    static func load() -> [StuckPointRecord] {
        // 파일 없음 = 첫 실행/기록 없음 — 정상.
        guard let data = try? Data(contentsOf: fileURL) else { return [] }
        if let list = try? JSONDecoder().decode([StuckPointRecord].self, from: data) {
            return list
        }
        if let legacy = try? JSONDecoder().decode([String].self, from: data) {
            let migrated = legacy.map { StuckPointRecord(text: $0) }
            save(migrated)
            return migrated
        }
        do {
            // 파일은 있는데 못 읽는다(쓰기 중 강제종료·스키마 변경). 삼키고 빈 배열로
            // 시작하면 다음 save 가 원본을 덮어쓴다 — 원문을 옆으로 옮겨 증거와
            // 복구 여지를 남긴 뒤에만 빈 목록으로 시작한다.
            let stamp = ISO8601DateFormatter().string(from: Date())
            try? FileManager.default.moveItem(
                at: fileURL, to: DataScope.url("stuck-points.corrupt-\(stamp).json"))
            NSLog("STUCKPOINTS-CORRUPT 손상 파일 격리: stuck-points.corrupt-%@.json", stamp)
            return []
        }
    }

    static func save(_ points: [StuckPointRecord]) {
        guard let data = try? JSONEncoder().encode(points) else { return }
        // 원자 쓰기 — 도중 강제종료로 반쪽 파일이 남지 않게.
        if (try? data.write(to: fileURL, options: .atomic)) == nil {
            // 저장 실패를 무음으로 흘리지 않는다 — 최소한 시스템 로그에 증거를 남긴다.
            NSLog("STUCKPOINTS-ERROR 저장 실패 (%d건) — 저장 공간 확인 필요", points.count)
        }
    }
}
