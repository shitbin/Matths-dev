//  ScreenshotGuard.swift
//  Matths
//
//  화면 보호. iOS 공개 API는 녹화·미러링 상태를 사전에 알려 주지만,
//  단발 스크린샷은 저장이 끝난 뒤에만 알린다. 따라서 녹화·미러링은 즉시
//  검정 덮개로 가리고, 스크린샷 알림은 비차단 감사 신호로만 기록한다.
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
    @Published private(set) var accountWatermarkCode: String

    /// 사용자 식별정보를 화면에 노출하지 않는 실행 단위 코드다. 계정 가명 코드는
    /// accountWatermarkCode로 분리하고, 이 값은 앱을 다시 열면 바뀐다.
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
        accountWatermarkCode = DataScope.screenProtectionAccountCode
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
        // SwiftUI scenePhase보다 먼저 오는 UIKit 수명주기 신호에서도 덮개를 켠다.
        // 앱 전환기 스냅샷이 만들어질 때 문제 화면이 한 프레임 남지 않게 하는 이중 안전장치다.
        observers.append(NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.setSceneActive(false) }
        })
        observers.append(NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.setSceneActive(true) }
        })
        observers.append(NotificationCenter.default.addObserver(
            forName: DataScope.didSwitchNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            MainActor.assumeIsolated {
                let slot = note.object as? String ?? DataScope.slot
                self?.accountWatermarkCode = DataScope.screenProtectionAccountCode(for: slot)
            }
        })
        refreshCaptureState()
    }

    func setBaseProtection(_ enabled: Bool) {
        baseProtection = enabled
        refreshCaptureState()
    }

    func beginProtection(_ id: UUID, surface: String) {
        protectionIDs[id] = ScreenIntegrityEventContract.normalizedSurface(surface)
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

    /// iOS 17+의 scene 단위 정식 감지 신호를 표시 계층에서 전달받는다.
    /// `UIScreen.isCaptured`는 초기화·구형 알림 폴백으로만 남긴다.
    func setSceneCaptureState(_ captured: Bool) {
        applyCaptureState(captured)
    }

    private func refreshCaptureState() {
        // iPad의 외부 디스플레이/다중 scene도 포함한다. scene이 아직 연결되기 전인
        // 앱 초기화 구간만 UIScreen.main으로 폴백한다.
        let sceneScreens = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.screen }
        let captured = sceneScreens.isEmpty
            ? UIScreen.main.isCaptured
            : sceneScreens.contains { $0.isCaptured }
        applyCaptureState(captured)
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
        guard let eventType = ScreenIntegrityEventContract.normalizedEventType(type) else { return }
        let surface = ScreenIntegrityEventContract.normalizedSurface(activeSurface)
        if let integrityEventRecorder {
            integrityEventRecorder(eventType, watermarkCode, surface)
            return
        }
        EventLog.append(eventType)
        SyncEngine.shared.enqueueIntegrityEvent(
            eventType,
            sessionCode: watermarkCode,
            surface: surface)
    }

    private func handleScreenshotDetected() {
        guard isProtected else { return }
        // 시스템 알림은 촬영 뒤에 오므로 캡처 자체를 취소할 수 없다. 학생의 풀이를
        // 가리는 사후 처벌형 모달은 띄우지 않고, 최소 감사 신호만 매번 기록한다.
        recordIntegrityEvent("protected-screen-screenshot")
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

/// 보호 화면의 실제 표시 계층. `fullScreenCover`는 앱 루트의 overlay보다 위에
/// 별도 presentation 계층으로 올라오므로, 루트와 보호 모달이 이 한 구현을 각각
/// 자기 최상단에 붙인다. 상태와 워터마크 코드는 같은 ScreenshotGuard를 공유한다.
struct ScreenProtectionLayer: View {
    @Environment(\.isSceneCaptured) private var isSceneCaptured
    @ObservedObject var guardModel: ScreenshotGuard
    var onCapture: (String) -> Void

    var body: some View {
        Group {
            if guardModel.isCaptureActive || guardModel.isPrivacyCoverActive {
                CapturePrivacyCover()
            } else {
                // 풀이를 가로질러 반복하던 워터마크를 제거한다. 화면 한 구역의 저대비
                // 가명 표식만 남겨 문제·수식·필기 가독성을 해치지 않는다.
                if guardModel.protectionEnabled {
                    ProtectedContentWatermark(
                        accountCode: guardModel.accountWatermarkCode,
                        sessionCode: guardModel.watermarkCode)
                }
            }
        }
        .onAppear {
            guardModel.setSceneCaptureState(isSceneCaptured)
        }
        .onChange(of: isSceneCaptured) { _, captured in
            guardModel.setSceneCaptureState(captured)
        }
    }
}

private struct ScreenProtectionLayerModifier: ViewModifier {
    @ObservedObject var guardModel: ScreenshotGuard
    var onCapture: (String) -> Void

    func body(content: Content) -> some View {
        content
            .overlay {
                ScreenProtectionLayer(guardModel: guardModel, onCapture: onCapture)
            }
            .animation(.easeOut(duration: 0.2), value: guardModel.isShowing)
    }
}

private struct ProtectedAssessmentPresentation: ViewModifier {
    let surface: String
    @ObservedObject var guardModel: ScreenshotGuard
    var onCapture: (String) -> Void

    func body(content: Content) -> some View {
        content
            .modifier(ProtectedAssessmentSurface(surface: surface))
            .modifier(ScreenProtectionLayerModifier(
                guardModel: guardModel,
                onCapture: onCapture))
    }
}

extension View {
    func protectedAssessmentSurface(_ surface: String = "assessment") -> some View {
        modifier(ProtectedAssessmentSurface(surface: surface))
    }

    /// 앱 루트처럼 이미 별도 보호 상태를 관리하는 계층에 공통 표시만 붙인다.
    func screenProtectionLayer(
        guardModel: ScreenshotGuard,
        onCapture: @escaping (String) -> Void
    ) -> some View {
        modifier(ScreenProtectionLayerModifier(
            guardModel: guardModel,
            onCapture: onCapture))
    }

    /// fullScreenCover 안에서 보호 등록과 표시 계층을 함께 붙인다. 둘을 따로
    /// 호출해 워터마크나 앱 전환 덮개 하나를 빠뜨리는 회귀를 막는다.
    func protectedAssessmentPresentation(
        _ surface: String = "assessment",
        guardModel: ScreenshotGuard,
        onCapture: @escaping (String) -> Void
    ) -> some View {
        modifier(ProtectedAssessmentPresentation(
            surface: surface,
            guardModel: guardModel,
            onCapture: onCapture))
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

/// 일반 SwiftUI 화면은 FairPlay 영상처럼 단발 스크린샷 결과를 강제로 검게 만들 수 없다.
/// 가명 코드는 풀이를 방해하지 않는 우하단 한 구역에만 아주 낮은 대비로 둔다.
struct ProtectedContentWatermark: View {
    let accountCode: String
    let sessionCode: String

    var body: some View {
        GeometryReader { proxy in
            Text("MATTHS · \(accountCode) · \(sessionCode)")
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundStyle(.primary.opacity(0.035))
                .lineLimit(1)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .frame(maxWidth: min(210, max(150, proxy.size.width * 0.42)))
                .background(.ultraThinMaterial.opacity(0.18), in: Capsule())
                .padding(.trailing, 10)
                .padding(.bottom, 10)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
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
