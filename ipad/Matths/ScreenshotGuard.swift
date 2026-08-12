//  ScreenshotGuard.swift
//  Matths
//
//  스크린샷 감지. iOS 는 캡처를 "막는" API 를 제공하지 않는다 —
//  감지 후 대응이 유일하게 정상적인 방법이다.
//  (isSecureTextEntry 로 화면을 검게 만드는 편법은 심사에서 문제가 되고
//   VoiceOver 접근성을 깨뜨린다. 쓰지 않는다.)

import SwiftUI
import UIKit

@MainActor
final class ScreenshotGuard: ObservableObject {
    typealias IntegrityEventRecorder = (_ type: String, _ sessionCode: String, _ surface: String) -> Void

    @Published var isShowing = false
    @Published var stuckPoint = ""
    @Published private(set) var isCaptureActive = false
    @Published private(set) var isPrivacyCoverActive = false
    @Published private(set) var protectionEnabled = false

    /// 사용자 식별정보를 화면에 노출하지 않는 실행 단위 코드다. 유출된 캡처가 어느
    /// 앱 실행에서 만들어졌는지 학생 본인과 검토자가 대조할 수 있고, 앱을 다시 열면 바뀐다.
    let watermarkCode = String(UUID().uuidString.prefix(8)).uppercased()

    private var baseProtection = false
    private var protectionIDs: [UUID: String] = [:]
    private var sceneIsActive = true
    private let integrityEventRecorder: IntegrityEventRecorder?
    var isProtected: Bool { baseProtection || !protectionIDs.isEmpty }

    private var activeSurface: String {
        let names = Set(protectionIDs.values).sorted()
        if !names.isEmpty { return names.joined(separator: ",") }
        return baseProtection ? "session" : "protected"
    }

    private var observers: [NSObjectProtocol] = []

    init(integrityEventRecorder: IntegrityEventRecorder? = nil) {
        self.integrityEventRecorder = integrityEventRecorder
        observers.append(NotificationCenter.default.addObserver(
            forName: UIApplication.userDidTakeScreenshotNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            // queue: .main 으로 등록했으므로 이 블록은 반드시 메인에서 실행된다.
            // 컴파일러는 그걸 증명하지 못하므로 명시해 준다.
            MainActor.assumeIsolated {
                self?.handleScreenshotDetected()
            }
        })
        observers.append(NotificationCenter.default.addObserver(
            forName: UIScreen.capturedDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshCaptureState() }
        })
        refreshCaptureState()
    }

    func setBaseProtection(_ enabled: Bool) {
        baseProtection = enabled
        refreshCaptureState()
    }

    func beginProtection(_ id: UUID, surface: String) {
        protectionIDs[id] = surface
        refreshCaptureState()
    }

    func endProtection(_ id: UUID) {
        protectionIDs.removeValue(forKey: id)
        refreshCaptureState()
    }

    func setSceneActive(_ active: Bool) {
        sceneIsActive = active
        isPrivacyCoverActive = !sceneIsActive && isProtected
    }

    private func refreshCaptureState() {
        applyCaptureState(UIScreen.main.isCaptured)
    }

    private func applyCaptureState(_ captured: Bool) {
        let wasCaptureActive = isCaptureActive
        protectionEnabled = isProtected
        isPrivacyCoverActive = !sceneIsActive && protectionEnabled
        isCaptureActive = protectionEnabled && captured
        if isCaptureActive && !wasCaptureActive {
            recordIntegrityEvent("protected-screen-capture-started")
        } else if !isCaptureActive && wasCaptureActive {
            recordIntegrityEvent("protected-screen-capture-ended")
        }
    }

    private func recordIntegrityEvent(_ type: String) {
        if let integrityEventRecorder {
            integrityEventRecorder(type, watermarkCode, activeSurface)
            return
        }
        EventLog.append(type)
        SyncEngine.shared.enqueueIntegrityEvent(
            type,
            sessionCode: watermarkCode,
            surface: activeSurface)
    }

    private func handleScreenshotDetected() {
        guard isProtected, !isShowing else { return }
        recordIntegrityEvent("protected-screen-screenshot")
        isShowing = true
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    #if DEBUG
    /// 실기 자가진단은 실제 서버 outbox 대신 주입된 recorder만 사용한다.
    /// 시스템 알림·UIScreen 연결은 별도 정적 계약으로 유지하고, 여기서는 실제 기기에서
    /// 동일 상태 전이와 overlay 조건을 결정론적으로 검증한다.
    func simulateScreenshotForDeviceQA() {
        handleScreenshotDetected()
    }

    func simulateCaptureStateForDeviceQA(_ captured: Bool) {
        applyCaptureState(captured)
    }
    #endif

    deinit { observers.forEach(NotificationCenter.default.removeObserver) }
}

private struct ProtectedAssessmentSurface: ViewModifier {
    @EnvironmentObject private var screenshotGuard: ScreenshotGuard
    let surface: String
    /// View 재계산마다 새 UUID를 만들면 onAppear에서 등록한 키와 onDisappear에서
    /// 해제하는 키가 달라져 보호 상태가 앱 전체에 영구 잔류할 수 있다.
    @State private var id = UUID()

    func body(content: Content) -> some View {
        content
            .onAppear { screenshotGuard.beginProtection(id, surface: surface) }
            .onDisappear { screenshotGuard.endProtection(id) }
    }
}

extension View {
    func protectedAssessmentSurface(_ surface: String = "assessment") -> some View {
        modifier(ProtectedAssessmentSurface(surface: surface))
    }
}

struct CapturePrivacyCover: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "lock.shield.fill").font(.system(size: 28))
                Text("보호된 평가 화면").font(.headline)
                Text("화면 녹화·미러링 중에는 문제와 풀이를 표시하지 않습니다.")
                    .font(.callout).multilineTextAlignment(.center)
            }
            .foregroundStyle(.white)
            .padding(24)
        }
        .accessibilityElement(children: .combine)
    }
}

/// 일반 SwiftUI 화면은 FairPlay 영상처럼 캡처 결과를 강제로 검게 만들 수 없다.
/// 대신 보호 화면 전체에 낮은 대비의 실행 코드를 반복해 무단 공유 억제와 사후 대조를 돕는다.
struct ProtectedContentWatermark: View {
    let code: String

    var body: some View {
        GeometryReader { proxy in
            let columns = max(3, Int(proxy.size.width / 210))
            let rows = max(5, Int(proxy.size.height / 150))
            ZStack {
                ForEach(0..<(columns * rows), id: \.self) { index in
                    let column = index % columns
                    let row = index / columns
                    Text("MATTHS · \(code)")
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundStyle(.primary.opacity(0.075))
                        .rotationEffect(.degrees(-22))
                        .position(
                            x: (CGFloat(column) + 0.5) * proxy.size.width / CGFloat(columns),
                            y: (CGFloat(row) + 0.5) * proxy.size.height / CGFloat(rows)
                        )
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

struct ScreenshotGuardOverlay: View {
    @ObservedObject var guardModel: ScreenshotGuard
    /// 학생이 적은 "막힌 지점" 을 오답노트로 넘긴다 — 잔소리가 아니라 기능이 되게.
    var onCapture: (String) -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.72).ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                Text("스크린샷이 감지되었습니다")
                    .font(.title2.weight(.heavy))

                Text("보호된 평가 화면의 캡처 기록은 시험 무결성 검토에 참고될 수 있습니다. "
                     + "학습을 위해 남길 내용은 오답노트에 저장되며, 로그인 계정에서는 다른 기기와 동기화됩니다.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                TextField("예: 증감표에서 부호가 왜 바뀌는지 모르겠음",
                          text: $guardModel.stuckPoint)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)

                HStack(spacing: 12) {
                    Button("막힌 지점 저장") {
                        onCapture(guardModel.stuckPoint)
                        guardModel.stuckPoint = ""
                        guardModel.isShowing = false
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(guardModel.stuckPoint.trimmingCharacters(in: .whitespaces).isEmpty)

                    Button("계속 풀기") { guardModel.isShowing = false }
                        .buttonStyle(.bordered)
                }
            }
            .padding(24)
            .frame(maxWidth: 460)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24))
            .padding(24)
        }
        .transition(.opacity)
        .accessibilityAddTraits(.isModal)
    }
}
