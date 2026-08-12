#if DEBUG
import Foundation
import UIKit

/// 실제 승급 오버레이를 9티어 모두 재생하면서 화면 갱신 간격을 기록한다.
/// 서버 판정·계정·DB를 만들지 않고 AppStore의 presentation 값만 일시적으로 사용한다.
@MainActor
enum RankPromotionPerformanceSelfTest {
    private struct TierSample: Codable {
        let tierCode: String
        let prewarmMs: Double
        let durationSeconds: Double
        let callbackCount: Int
        let estimatedDroppedFrames: Int
        let hitchCount: Int
        let hitchOffsetsMs: [Double]
        let dropRatio: Double
        let p50FrameMs: Double
        let p95FrameMs: Double
        let maxFrameMs: Double
        let passed: Bool
    }

    private struct Report: Codable {
        let schemaVersion: String
        let result: String
        let observedAt: String
        let deviceModel: String
        let hardwareIdentifier: String
        let osVersion: String
        let appVersion: String
        let appBuild: String
        let maximumFramesPerSecond: Int
        let lowPowerModeEnabled: Bool
        let reduceMotionEnabled: Bool
        let serverSyncSuppressed: Bool
        let tiers: [TierSample]
    }

    static func runIfRequested(store: AppStore) async {
        guard ProcessInfo.processInfo.arguments.contains("-rankPromotionPerformanceSelfTest") else {
            return
        }

        // 앱 root의 9티어 합성 prewarm이 끝난 뒤 계측한다. 고정 1초만 기다리면
        // 느린 기기에서 prewarm과 첫 티어 재생이 겹쳐 둘 다의 수치를 오염시킨다.
        guard await RankPromotionPipelinePrewarmState.waitUntilReady() else {
            NSLog("RankPromotionPerformanceSelfTest pipeline prewarm timed out")
            return
        }
        try? await Task.sleep(for: .milliseconds(250))
        let previousMotion = store.motionOn
        store.motionOn = true
        defer {
            store.rankPromotionPresentation = nil
            store.motionOn = previousMotion
        }

        var samples: [TierSample] = []
        for tier in RankTier.allCases {
            let prewarmStarted = CACurrentMediaTime()
            await withCheckedContinuation { continuation in
                RankBadgeAssets.prewarmPromotion(tier: tier) {
                    continuation.resume()
                }
            }
            let prewarmMs = (CACurrentMediaTime() - prewarmStarted) * 1_000
            let monitor = DisplayLinkMonitor()
            monitor.start()
            store.rankPromotionPresentation = .init(
                id: "performance-self-test:\(tier.rawValue)",
                tierCode: tier.rawValue)
            // 1.4초 조립 시작과 5.7초 카피 등장, 마감 반동까지 포함한다.
            try? await Task.sleep(for: .milliseconds(7_400))
            samples.append(monitor.stop(tierCode: tier.rawValue, prewarmMs: prewarmMs))
            store.rankPromotionPresentation = nil
            try? await Task.sleep(for: .milliseconds(550))
        }

        let info = Bundle.main.infoDictionary ?? [:]
        let passed = !UIAccessibility.isReduceMotionEnabled
            && samples.count == RankTier.allCases.count
            && samples.allSatisfy(\.passed)
        let report = Report(
            schemaVersion: "MATTHS_RANK_PROMOTION_PERFORMANCE_V1",
            result: passed ? "PASS" : "FAIL",
            observedAt: ISO8601DateFormatter().string(from: Date()),
            deviceModel: UIDevice.current.model,
            hardwareIdentifier: hardwareIdentifier(),
            osVersion: UIDevice.current.systemVersion,
            appVersion: String(info["CFBundleShortVersionString"] as? String ?? "unknown"),
            appBuild: String(info["CFBundleVersion"] as? String ?? "unknown"),
            maximumFramesPerSecond: UIScreen.main.maximumFramesPerSecond,
            lowPowerModeEnabled: ProcessInfo.processInfo.isLowPowerModeEnabled,
            reduceMotionEnabled: UIAccessibility.isReduceMotionEnabled,
            serverSyncSuppressed: true,
            tiers: samples)

        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(report)
            let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("rank-promotion-performance.json")
            try data.write(to: url, options: .atomic)
        } catch {
            NSLog("RankPromotionPerformanceSelfTest report write failed: %@", String(describing: error))
        }
    }

    private static func hardwareIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        return withUnsafePointer(to: &systemInfo.machine) { pointer in
            pointer.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(cString: $0)
            }
        }
    }

    @MainActor
    private final class DisplayLinkMonitor: NSObject {
        private var displayLink: CADisplayLink?
        private var lastTimestamp: CFTimeInterval?
        private var startedAt = CACurrentMediaTime()
        private var intervals: [Double] = []
        private var droppedFrames = 0
        private var hitches = 0
        private var hitchOffsetsMs: [Double] = []

        func start() {
            startedAt = CACurrentMediaTime()
            let link = CADisplayLink(target: self, selector: #selector(tick(_:)))
            let maximum = Float(max(60, UIScreen.main.maximumFramesPerSecond))
            link.preferredFrameRateRange = CAFrameRateRange(
                minimum: 60,
                maximum: maximum,
                preferred: maximum)
            link.add(to: .main, forMode: .common)
            displayLink = link
        }

        func stop(tierCode: String, prewarmMs: Double) -> TierSample {
            displayLink?.invalidate()
            displayLink = nil
            let duration = CACurrentMediaTime() - startedAt
            let sorted = intervals.sorted()
            let p50 = percentile(sorted, 0.50)
            let p95 = percentile(sorted, 0.95)
            let maximum = sorted.last ?? 0
            let totalFrames = intervals.count + droppedFrames
            let dropRatio = totalFrames > 0 ? Double(droppedFrames) / Double(totalFrames) : 1
            let enoughSamples = intervals.count >= 180 && duration >= 7
            let passed = enoughSamples && dropRatio <= 0.05 && maximum <= 0.100
            return TierSample(
                tierCode: tierCode,
                prewarmMs: rounded(prewarmMs),
                durationSeconds: rounded(duration),
                callbackCount: intervals.count,
                estimatedDroppedFrames: droppedFrames,
                hitchCount: hitches,
                hitchOffsetsMs: hitchOffsetsMs.map(rounded),
                dropRatio: rounded(dropRatio),
                p50FrameMs: rounded(p50 * 1_000),
                p95FrameMs: rounded(p95 * 1_000),
                maxFrameMs: rounded(maximum * 1_000),
                passed: passed)
        }

        @objc private func tick(_ link: CADisplayLink) {
            defer { lastTimestamp = link.timestamp }
            guard let lastTimestamp else { return }
            let actual = max(0, link.timestamp - lastTimestamp)
            let expected = max(1.0 / 120.0, link.targetTimestamp - link.timestamp)
            intervals.append(actual)
            let representedFrames = max(1, Int((actual / expected).rounded()))
            droppedFrames += max(0, representedFrames - 1)
            if actual > expected * 1.5 {
                hitches += 1
                if hitchOffsetsMs.count < 24 {
                    hitchOffsetsMs.append((link.timestamp - startedAt) * 1_000)
                }
            }
        }

        private func percentile(_ sorted: [Double], _ percentile: Double) -> Double {
            guard !sorted.isEmpty else { return 0 }
            let index = min(sorted.count - 1, max(0, Int((Double(sorted.count - 1) * percentile).rounded())))
            return sorted[index]
        }

        private func rounded(_ value: Double) -> Double {
            (value * 10_000).rounded() / 10_000
        }
    }
}
#endif
