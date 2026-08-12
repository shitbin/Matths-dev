//  ExamTimer.swift
//  Matths
//
//  밀리초 타이머. 7/27 요구: 랭킹전에서 점수가 같으면 더 빨리 푼 사람이 위.
//  따라서 ms 단위 기록이 필요하다.
//
//  중요: Date() 로 재면 안 된다. 사용자가 기기 시각을 바꾸거나
//  NTP 동기화가 끼면 값이 튄다. 단조 시계(monotonic)를 써야 한다.

import SwiftUI
import Combine

@MainActor
final class ExamTimer: ObservableObject {
    @Published private(set) var elapsedMs: Int = 0
    @Published private(set) var isRunning = false

    private var startedAt: ContinuousClock.Instant?
    private var accumulated: Duration = .zero
    private var ticker: AnyCancellable?

    var display: String {
        let total = elapsedMs
        let m = total / 60_000
        let s = (total % 60_000) / 1000
        return String(format: "%02d:%02d", m, s)
    }
    var displayMs: String { String(format: ".%03d", elapsedMs % 1000) }

    func start() {
        guard !isRunning else { return }
        startedAt = ContinuousClock.now
        isRunning = true
        // 화면 갱신은 30fps면 충분하다. 기록 자체는 정지 시점에 정확히 계산된다.
        ticker = Timer.publish(every: 1.0 / 30.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in self?.refresh() }
    }

    func pause() {
        guard isRunning, let startedAt else { return }
        accumulated += ContinuousClock.now - startedAt
        self.startedAt = nil
        isRunning = false
        ticker?.cancel(); ticker = nil
        refresh()
    }

    /// 시험 중도 이탈 후 복귀 대응 — 7/27 "문제 나가도 저장되게 하자"
    func restore(elapsedMs ms: Int) {
        accumulated = .milliseconds(ms)
        refresh()
    }

    private func refresh() {
        var total = accumulated
        if let startedAt { total += ContinuousClock.now - startedAt }
        elapsedMs = Int(total.components.seconds * 1000
                        + total.components.attoseconds / 1_000_000_000_000_000)
    }
}
