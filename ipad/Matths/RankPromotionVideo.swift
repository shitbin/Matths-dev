import AVFoundation
import SwiftUI
import UIKit

/// 웹에서 승인·버전 고정한 9개 승급 MP4의 iPad 번들 레지스트리다.
/// 티어 판정은 만들지 않고 이미 결정된 서버 코드를 영상 파일로만 매핑한다.
enum RankPromotionVideoAssets {
    private static let filenames: [RankTier: String] = [
        .bronze: "bronze-rank-up.v6",
        .silver: "silver-rank-up.v6",
        .gold: "gold-rank-up.v6",
        .platinum: "platinum-rank-up.v7",
        .emerald: "emerald-rank-up.v6",
        .diamond: "diamond-rank-up.v6",
        .master: "master-rank-up.v6",
        .grandmaster: "grandmaster-rank-up.v6",
        .challenger: "challenger-rank-up.v12",
    ]

    static func url(for tier: RankTier) -> URL? {
        guard let name = filenames[tier] else { return nil }
        return Bundle.main.url(forResource: name, withExtension: "mp4", subdirectory: "RankMotion")
            ?? Bundle.main.url(forResource: name, withExtension: "mp4")
    }
}

/// AVPlayerLayer의 hardware decode 경로를 사용하고 resizeAspect로 9:16 원본을
/// landscape iPad에서도 자르지 않는다. 영상 안 AAC가 승인 음향이므로 별도 SFX는 없다.
struct RankPromotionVideoPlayer: UIViewRepresentable {
    let url: URL
    let playbackID: UUID
    let motionActive: Bool
    let onComplete: () -> Void
    let onFailure: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onComplete: onComplete, onFailure: onFailure)
    }

    func makeUIView(context: Context) -> PlayerSurface {
        let view = PlayerSurface()
        context.coordinator.attach(to: view)
        context.coordinator.configure(url: url, playbackID: playbackID, motionActive: motionActive)
        return view
    }

    func updateUIView(_ view: PlayerSurface, context: Context) {
        context.coordinator.onComplete = onComplete
        context.coordinator.onFailure = onFailure
        context.coordinator.attach(to: view)
        context.coordinator.configure(url: url, playbackID: playbackID, motionActive: motionActive)
    }

    static func dismantleUIView(_ view: PlayerSurface, coordinator: Coordinator) {
        coordinator.stop()
        view.playerLayer.player = nil
    }

    final class PlayerSurface: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }

        override init(frame: CGRect) {
            super.init(frame: frame)
            backgroundColor = .clear
            isUserInteractionEnabled = false
            playerLayer.videoGravity = .resizeAspect
        }

        required init?(coder: NSCoder) { nil }
    }

    @MainActor
    final class Coordinator: NSObject {
        var onComplete: () -> Void
        var onFailure: () -> Void
        private weak var surface: PlayerSurface?
        private var player: AVPlayer?
        private var item: AVPlayerItem?
        private var playbackID: UUID?
        private var url: URL?
        private var endObserver: NSObjectProtocol?
        private var failureObserver: NSObjectProtocol?

        init(onComplete: @escaping () -> Void, onFailure: @escaping () -> Void) {
            self.onComplete = onComplete
            self.onFailure = onFailure
        }

        deinit {
            if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
            if let failureObserver { NotificationCenter.default.removeObserver(failureObserver) }
        }

        func attach(to surface: PlayerSurface) {
            self.surface = surface
            surface.playerLayer.player = player
        }

        func configure(url: URL, playbackID: UUID, motionActive: Bool) {
            guard self.playbackID != playbackID || self.url != url else { return }
            stop()
            self.playbackID = playbackID
            self.url = url

            let item = AVPlayerItem(url: url)
            item.preferredForwardBufferDuration = 1
            let player = AVPlayer(playerItem: item)
            player.actionAtItemEnd = .pause
            player.automaticallyWaitsToMinimizeStalling = true
            player.isMuted = !motionActive
            self.item = item
            self.player = player
            surface?.playerLayer.player = player

            endObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: item,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor [weak self] in self?.onComplete() }
            }
            failureObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemFailedToPlayToEndTime,
                object: item,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor [weak self] in self?.onFailure() }
            }

            if motionActive {
                player.playImmediately(atRate: 1)
            } else {
                // Reduce Motion에서는 소리와 시간 진행 없이 완성 휘장 정지 프레임만 보인다.
                player.seek(
                    to: CMTime(seconds: 5.7, preferredTimescale: 600),
                    toleranceBefore: .zero,
                    toleranceAfter: .zero)
                player.pause()
            }
        }

        func stop() {
            player?.pause()
            if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
            if let failureObserver { NotificationCenter.default.removeObserver(failureObserver) }
            endObserver = nil
            failureObserver = nil
            item = nil
            player = nil
            surface?.playerLayer.player = nil
        }
    }
}
