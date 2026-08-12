import Foundation

enum DataScope {
    static let root = FileManager.default.temporaryDirectory
        .appendingPathComponent("matths-eventlog-\(UUID().uuidString)", isDirectory: true)

    static func url(_ name: String) -> URL {
        try? FileManager.default.createDirectory(
            at: root, withIntermediateDirectories: true)
        return root.appendingPathComponent(name)
    }
}

@main
struct EventLogCases {
    static func main() throws {
        defer { try? FileManager.default.removeItem(at: DataScope.root) }

        EventLog.appendGrading(correct: 3, total: 5, durationMs: 120_000)

        let events = EventLog.all()
        precondition(events.count == 5, "묶음 채점은 문항 5개로 기록돼야 함")
        precondition(Set(events.map(\.clientEventId)).count == 5, "이벤트 ID는 모두 달라야 함")
        precondition(events.compactMap(\.durationMs).reduce(0, +) == 120_000,
                     "문항별로 나눈 시간의 합이 원래 경과 시간과 같아야 함")

        let solved = EventLog.weeklySolved()
        precondition(solved.this == 5 && solved.prev == 0, "최근 7일 풀이 집계 오류")

        let accuracy = EventLog.weeklyAccuracy()
        precondition(accuracy.this == 60, "최근 7일 정답률은 3/5 = 60%여야 함")

        let minutes = EventLog.weeklyMinutes()
        precondition(minutes.this == 2, "최근 7일 학습 시간은 2분이어야 함")
        precondition(EventLog.activeStudyDays() == 1, "학습한 날은 1일이어야 함")

        let labels = EventLog.recentDayLabels()
        precondition(labels.count == 7 && labels.last == "오늘",
                     "최근 7일 차트 마지막 라벨은 오늘이어야 함")

        try checkFixedDashboardContract()

        print("EventLog 최근 7일 집계·KST 대시보드 계약 전부 통과")
    }

    private static func checkFixedDashboardContract() throws {
        let now = try date("2026-07-30T12:34:56Z")
        let fixedEvents = [
            event("problem-correct", "2026-07-17T03:00:00Z", 60_000),
            // 같은 날짜 안에서 먼저 합산하고 반올림해야 2분이 아니라 1분이다.
            event("concept-closed", "2026-07-20T03:00:00Z", 31_000),
            event("concept-closed", "2026-07-20T04:00:00Z", 31_000),
            event("problem-correct", "2026-07-24T03:00:00Z", 31_000),
            event("problem-correct", "2026-07-24T04:00:00Z", 31_000),
            event("problem-wrong", "2026-07-27T03:00:00Z", 3_600_000),
            event("problem-correct", "2026-07-30T03:00:00Z", 149_999),
            // 오늘과 같은 KST 날짜여도 아직 오지 않은 시각은 집계하지 않는다.
            event("problem-correct", "2026-07-30T13:00:00Z", 99_000_000),
            // 직전 기간 시작보다 1초 이른 이벤트도 제외한다.
            event("problem-correct", "2026-07-16T14:59:59Z", 99_000_000),
        ]
        let snapshot = EventLog.dashboardSnapshot(now: now, events: fixedEvents)

        precondition(snapshot.weeklyStudyMinutes == 63, "최근 7일은 날짜별 반올림 후 63분")
        precondition(snapshot.previousStudyMinutes == 2, "직전 7일은 2분")
        precondition(snapshot.weeklyStudyDetail == "지난주보다 61분 늘었어요", "학습 비교 문구")
        precondition(snapshot.todayStudyMinutes == 2, "오늘은 미래 이벤트를 빼고 2분")
        precondition(snapshot.activeStudyDays == 3, "학습일은 3일")
        precondition(snapshot.averageStudyMinutes == 21, "학습일 평균은 21분")
        precondition(snapshot.weeklySolvedProblems == 4, "최근 풀이 수")
        precondition(snapshot.previousSolvedProblems == 1, "직전 풀이 수")
        precondition(snapshot.weeklySolvedDetail == "지난주보다 3문제 늘었어요", "풀이 비교 문구")
        precondition(snapshot.correctRate == 75, "정답률은 반올림한 75%")
        precondition(snapshot.previousCorrectRate == 100, "직전 정답률은 100%")
        precondition(snapshot.correctRateDetail == "지난주보다 25% 적어요", "음수 비교 문구")
        precondition(snapshot.days.count == 7 && snapshot.days.last?.label == "오늘",
                     "차트는 오늘을 끝으로 하는 7일")
        precondition(snapshot.maxMinutes == 60, "차트 최대값은 최대 학습일 60분")
    }

    private static func event(_ type: String, _ at: String, _ durationMs: Int?) -> LearningEventV1 {
        LearningEventV1(
            clientEventId: UUID().uuidString,
            type: type,
            conceptId: nil,
            durationMs: durationMs,
            at: try! date(at))
    }

    private static func date(_ value: String) throws -> Date {
        guard let result = ISO8601DateFormatter().date(from: value) else {
            throw NSError(domain: "EventLogCases", code: 1)
        }
        return result
    }
}
