//  CoachEngine.swift
//  Matths
//
//  맵쓰 코치 — "동물의숲 NPC" 방식. LLM 호출 없이 (상황 × 수위) 스크립트 풀에서 뽑는다.
//  mapss-demo/shared/coach.js 의 Swift 이식판. 대사 풀도 그대로 가져왔다.
//
//  수위: 순한맛 / 매운맛 / 무음. 웹·서버와 같은 세 모드만 사용한다.
//
//  안전 밸브 (기획 15장): 같은 흐름에서 3연속 오답이면 수위와 무관하게
//  순한맛으로 강제 전환한다. 무너진 학생에게 화력을 올리지 않는다.

import Foundation

/// 코치 말투.
///
/// **서버 스키마는 `["mild","spicy","silent"]` 만 받는다**
/// (레포 `models/matthsModel.js` preferenceSchema.coachMode, 기본값 spicy).
/// 서버의 `preferences.coachMode`와 같은 enum만 사용한다. 앱 전용 모드를
/// 추가하면 같은 학생이 웹과 앱에서 다른 설정을 보게 되므로 허용하지 않는다.
enum SpiceLevel: String, CaseIterable, Identifiable, Sendable {
    case mild, spicy, silent
    var id: String { rawValue }

    var name: String {
        switch self {
        case .mild:   return "순한맛"
        case .spicy:  return "매운맛"
        case .silent: return "무음"
        }
    }

    /// 서버 `preferences.coachMode` 에 올릴 값. 스키마에 없는 값은 보내지 않는다.
    var serverValue: String { rawValue }

    /// 서버에서 받은 값 → 앱 모드
    static func fromServer(_ raw: String?) -> SpiceLevel {
        SpiceLevel(rawValue: raw ?? "") ?? .spicy
    }
}

enum CoachSituation {
    case quizIntro, correct1, correctRetry, wrong1, wrong2, wrong3, done
}

struct CoachEngine {
    var level: SpiceLevel = .spicy      // 기본값: 매운맛 (데모와 동일)
    var wrongStreak = 0
    var shu = 0                         // 오답 누적 게이지 (Scoville)
    var softened = false                // 3연속 오답 → 자동 완화
    private var lastLine = ""
    private var rng = SystemRandomNumberGenerator()

    // MARK: 대사 풀 — mapss-demo coach.js 에서 그대로 이식

    private static let lines: [SpiceLevel: [String: [String]]] = [
        .mild: [
            "quizIntro":    ["이제 확인해볼 시간이에요. 부담 갖지 말고 골라보세요.",
                             "방금 관찰한 걸 떠올리면서 풀어보세요."],
            "correct1":     ["정답이에요! 방금 그 사고 과정이 핵심이에요.",
                             "완벽해요. 개념이 제대로 자리 잡았네요."],
            "correctRetry": ["좋아요, 결국 해냈네요. 틀렸던 과정도 다 공부예요.",
                             "정답! 다시 도전한 용기가 멋져요."],
            "wrong1":       ["아쉬워요! 풀이를 한 번 더 살펴볼까요?",
                             "괜찮아요. 어디서 헷갈렸는지 같이 찾아봐요."],
            "wrong2":       ["이 부분이 원래 헷갈려요. 모범 풀이와 비교해 보는 것도 방법이에요.",
                             "한 번 더 천천히 생각해봐요. 급할 것 없어요."],
            "wrong3":       ["괜찮아요. 지금부터 차근차근 다시 설명해줄게요."],
            "done":         ["이 시험 완료! 다음 것도 이렇게 정복해봐요."],
        ],
        .spicy: [
            "quizIntro":    ["자, 실전이다. 방금 배운 거 그대로 나온다.",
                             "문제 나간다. 틀리면 알지?"],
            "correct1":     ["오 정답. 방금 네 뇌가 제 기능을 했다.",
                             "맞았네? 오늘 컨디션 좋은데?",
                             "정답. 출제자 의도를 네가 먼저 읽었다."],
            "correctRetry": ["그래, 결국 맞췄네. 처음부터 이렇게 하지 그랬어.",
                             "정답. 오답과의 장기연애 드디어 청산했다."],
            "wrong1":       ["땡. 이건 함정도 아니었는데 네가 직접 구덩이를 팠다.",
                             "오답. 정답이 코앞에서 손 흔들었는데 모른 척했네.",
                             "틀렸다. 공식은 잘못이 없어. 네 대입이 잠깐 외출했을 뿐."],
            "wrong2":       ["또 틀렸다? 이제 우연이라는 변명은 압수한다.",
                             "두 번째다. 감으로 찍지 말고 풀이를 봐."],
            "wrong3":       ["됐다, 그만. 지금부터 내가 떠먹여준다. 눈만 뜨고 있어."],
            "done":         ["시험 하나 격파. 이 맛에 수학 하는 거지."],
        ],
    ]

    // MARK: 대사 뽑기

    private mutating func say(_ situation: CoachSituation) -> String {
        let key = String(describing: situation)

        // 자동 완화: 무너진 학생에게는 수위와 무관하게 순한맛
        var effective = level
        if softened, ["wrong1", "wrong2", "wrong3", "quizIntro"].contains(key) {
            effective = .mild
        }

        // 무음 모드는 **문구를 내지 않는다.** 웹 yaml 의 silent 가 그런 뜻이다
        // (모드가 있는데 폴백으로 순한맛 문구가 튀어나오면 무음이 아니게 된다).
        if effective == .silent { lastLine = ""; return "" }

        // 문구는 **웹 coach-messages.yaml 이 진실원이다.**
        //
        // 예전엔 Swift 소스에 별도 배열을 박아 뒀고 웹 문구와 **일치하는 게 한 줄도
        // 없었다.** 같은 학생이 웹과 앱에서 전혀 다른 코치를 만났다.
        // 이제 그 yaml 을 번들(coach-messages.json)로 넣고 여기서 읽는다.
        //
        // 축이 다르므로 매핑한다 — 웹은 상황 3종, 앱은 7종이다:
        //   correct    → correct1 · correctRetry
        //   incorrect  → wrong1 · wrong2 · wrong3
        //   unanswered → quizIntro
        //   done       → 웹에 대응이 없다(앱 전용 마무리 멘트) → 기존 풀 유지
        if let webPool = CoachMessages.pool(mode: effective, situation: key), !webPool.isEmpty {
            var line = webPool.randomElement(using: &rng) ?? "…"
            var g = 0
            while line == lastLine && webPool.count > 1 && g < 5 {
                line = webPool.randomElement(using: &rng) ?? line
                g += 1
            }
            lastLine = line
            return line
        }

        let pool = Self.lines[effective]?[key] ?? Self.lines[.mild]?[key] ?? ["…"]
        var line = pool.randomElement(using: &rng) ?? "…"
        var guardCount = 0
        while line == lastLine && pool.count > 1 && guardCount < 5 {
            line = pool.randomElement(using: &rng) ?? line
            guardCount += 1
        }
        lastLine = line
        return line
    }

    mutating func onCorrect() -> String {
        let wasRetry = wrongStreak > 0
        wrongStreak = 0
        softened = false
        shu = max(0, shu - 4000)
        return say(wasRetry ? .correctRetry : .correct1)
    }

    mutating func onWrong() -> String {
        wrongStreak += 1
        shu += level == .spicy ? 6000 : 3000
        if wrongStreak >= 3 {
            softened = true
            return say(.wrong3)
        }
        return say(wrongStreak == 1 ? .wrong1 : .wrong2)
    }

    mutating func onExamDone() -> String { say(.done) }

    /// 오답이 누적될수록 다음 설명을 더 직접적으로 제시하는 학습 온도.
    var shuLabel: String {
        if shu <= 0 { return "학습 온도 · 안정" }
        let formatted = NumberFormatter.localizedString(from: NSNumber(value: shu), number: .decimal)
        if shu < 10_000 { return "학습 온도 \(formatted) · 점검" }
        if shu < 30_000 { return "학습 온도 \(formatted) · 집중" }
        return "학습 온도 \(formatted) · 다시 설명"
    }

    /// 게이지 진행률 (0...1) — 내부 누적값 40,000을 가득으로 본다.
    var shuProgress: Double { min(1, Double(shu) / 40_000) }
}


// MARK: - 웹 코치 문구 (coach-messages.yaml 이식본)
//
// 레포 `content_folder/coach-messages.yaml` 을 그대로 JSON 으로 옮긴 것이다.
// 문구를 고쳐야 하면 **레포 yaml 을 먼저 고치고** 여기로 다시 뽑는다 —
// 여기서 먼저 고치면 웹과 앱이 또 갈라진다.
enum CoachMessages {
    private struct File: Decodable {
        struct Mode: Decodable { let label: String; let messages: [String: [String]] }
        let modes: [String: Mode]
    }

    private static let file: File? = {
        guard let url = Bundle.main.url(forResource: "coach-messages", withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(File.self, from: data)
    }()

    /// 앱 상황 키(7종) → 웹 상황 키(3종)
    private static func webSituation(_ appKey: String) -> String? {
        switch appKey {
        case "correct1", "correctRetry":     return "correct"
        case "wrong1", "wrong2", "wrong3":   return "incorrect"
        case "quizIntro":                    return "unanswered"
        default:                             return nil   // "done" 은 웹에 없다
        }
    }

    static func pool(mode: SpiceLevel, situation appKey: String) -> [String]? {
        guard let situation = webSituation(appKey) else { return nil }
        return file?.modes[mode.rawValue]?.messages[situation]
    }
}
