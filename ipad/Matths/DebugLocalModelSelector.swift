#if DEBUG
import SwiftUI

/// 실험 빌드에서만 보이는 로컬 추론 모델 선택기.
/// 선택과 실제 로드 상태를 분리해, 메뉴만 바뀌고 이전 모델이 계속 도는 착시를 막는다.
struct DebugLocalModelSelector: View {
    @Binding var selection: String?
    var openModelLabel: String?

    @ObservedObject private var downloader = ModelDownloader.shared

    private struct Option: Identifiable {
        let id: String
        let title: String
        let spec: ModelDownloader.ModelSpec?
        var isExperimental: Bool { id == "ling3-q3" }
    }

    private var options: [Option] {
        [
            Option(id: "auto", title: "자동 · 기기 권장", spec: nil),
            Option(id: "deepseek7B", title: "DeepSeek R1 7B", spec: ModelDownloader.specDeepSeek7B),
            Option(id: "ling3-q3", title: "Ling 3.0 tiny Q3", spec: ModelDownloader.specLing3Q3),
            Option(id: "4B", title: "Qwen 4B", spec: ModelDownloader.spec4B),
            Option(id: "9B-lite", title: "Qwen 9B 경량", spec: ModelDownloader.spec9BLite),
            Option(id: "9B-lite-text", title: "Qwen 9B 3비트 텍스트", spec: ModelDownloader.spec9BLiteText),
            Option(id: "9B", title: "Qwen 9B 풀", spec: ModelDownloader.spec9B),
        ]
    }

    private var selectedID: String { selection ?? "auto" }
    private var selectedOption: Option {
        options.first(where: { $0.id == selectedID }) ?? options[0]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s2) {
                Label("AI 실험실", systemImage: "cpu")
                    .font(.mBodyB)
                    .foregroundStyle(Tokens.ink)
                if selectedOption.isExperimental {
                    Text("실험")
                        .font(.mMicro)
                        .foregroundStyle(Tokens.warningInk)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Tokens.warningSoft, in: Capsule())
                }
                Spacer(minLength: Tokens.Space.s2)
                if let openModelLabel {
                    Text(openModelLabel)
                        .font(.mMicro)
                        .foregroundStyle(Tokens.text3)
                        .lineLimit(1)
                }
            }

            HStack(spacing: Tokens.Space.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("수학 추론")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text3)
                    Text(selectedOption.title)
                        .font(.mBodyB)
                        .foregroundStyle(Tokens.ink)
                        .lineLimit(1)
                }
                Spacer(minLength: Tokens.Space.s2)
                Menu {
                    ForEach(options) { option in
                        Button {
                            apply(option.id)
                        } label: {
                            Label(optionLabel(option), systemImage:
                                option.id == selectedID ? "checkmark" : "circle")
                        }
                    }
                } label: {
                    Label("모델 변경", systemImage: "slider.horizontal.3")
                        .font(.mCaption.weight(.semibold))
                        .frame(minHeight: 44)
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("수학 추론 모델 변경")
                .accessibilityValue(selectedOption.title)
            }

            HStack(spacing: 6) {
                Image(systemName: "camera.viewfinder")
                Text("사진 판독은 Qwen VL 3B로 고정 · 두 모델은 순차 실행")
            }
            .font(.mMicro)
            .foregroundStyle(Tokens.text4)

            if selectedOption.isExperimental {
                Text("Ling은 미병합 bailingmoe3 런타임을 쓰는 DEBUG 전용 후보입니다. Release에는 노출되지 않습니다.")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.warningInk)
                    .fixedSize(horizontal: false, vertical: true)
            }

            switch downloader.state {
            case .downloading(let progress):
                ProgressView(value: progress) {
                    Text("\(selectedOption.title) 내려받는 중 · \(Int(progress * 100))%")
                        .font(.mMicro)
                }
                .tint(Tokens.primary)
            case .failed(let message):
                Text("내려받기 실패 · \(message)")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.dangerInk)
            default:
                EmptyView()
            }
        }
        .padding(Tokens.Space.s3)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .strokeBorder(Tokens.line, lineWidth: 1)
        )
    }

    private func optionLabel(_ option: Option) -> String {
        guard let spec = option.spec else { return option.title }
        let availability = LocalAIModelPack.fileReady(spec.file) ? "설치됨" : spec.sizeLabel
        return "\(option.title) · \(availability)"
    }

    private func apply(_ id: String) {
        let tier: String? = id == "auto" ? nil : id
        selection = tier
        ModelDownloader.debugForcedTier = tier
        if !ModelDownloader.shared.startForTierSwitch() {
            AITutor.shared.loadRecommended()
        }
    }
}
#endif
