//  CurriculumStoryTimeline.swift
//  Matths
//
//  학생이 풀이 흐름을 장면으로 기억하는 세로 ‘기억선’.
//  번호 카드 대신 직관·질문·오개념·풀이 리듬·회상이라는 의미 있는 노드를 쓴다.

import SwiftUI

struct CurriculumStoryTimeline: View {
    let resolution: CurriculumStoryResolution

    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var player = CurriculumNarrationPlayer()
    @State private var expandedSceneIDs = Set<String>()

    var body: some View {
        Group {
            if let story = resolution.story {
                publishedStory(story)
            } else {
                unavailableStory
            }
        }
        .onAppear {
            if let story = resolution.story { player.load(story) }
        }
        .onChange(of: resolution.story?.narrationCheckpointID) { _, _ in
            expandedSceneIDs.removeAll()
            player.unload()
            if let story = resolution.story { player.load(story) }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { player.pauseForInterruption() }
        }
        .onDisappear { player.pauseForInterruption() }
    }

    @ViewBuilder
    private func publishedStory(_ story: CurriculumStudentStory) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s6) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s6) {
                    storyHeading(story)
                    Spacer(minLength: Tokens.Space.s4)
                    narrationControls
                        .frame(width: 260)
                }
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    storyHeading(story)
                    narrationControls
                }
            }

            Divider().overlay(Tokens.line)

            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(story.scenes.enumerated()), id: \.element.id) { index, scene in
                    memoryBeat(scene, isLast: index == story.scenes.count - 1)
                }
            }
        }
        .padding(Tokens.Space.s6)
        .background(Tokens.paper, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .strokeBorder(Tokens.lineStrong, lineWidth: 1)
        }
        .accessibilityIdentifier("curriculum-story-timeline")
    }

    private func storyHeading(_ story: CurriculumStudentStory) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            HStack(spacing: Tokens.Space.s2) {
                Text("풀이 기억선")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.progressBlue)
                Text("약 \(max(1, story.estimatedSeconds / 60))분")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text3)
            }
            Text(story.title)
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(story.openingQuestion)
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var narrationControls: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Button {
                player.toggle()
            } label: {
                Label(player.primaryButtonLabel, systemImage: player.primaryButtonSymbol)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(player.state == .failed)
            .accessibilityIdentifier("curriculum-narration-toggle")

            if player.hasProgress {
                Button("처음부터") { player.restart() }
                    .buttonStyle(SecondaryButtonStyle())
                    .frame(maxWidth: .infinity)
            }

            Text(player.message)
                .font(.mMicro)
                .foregroundStyle(player.state == .failed ? Tokens.warningInk : Tokens.text3)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("curriculum-narration-status")
        }
    }

    private func memoryBeat(
        _ scene: CurriculumStudentStoryScene,
        isLast: Bool
    ) -> some View {
        let active = player.currentSceneID == scene.id
            && [.playing, .paused].contains(player.state)

        return HStack(alignment: .top, spacing: Tokens.Space.s4) {
            VStack(spacing: 0) {
                ZStack {
                    Circle()
                        .fill(nodeColor(scene.kind))
                        .frame(width: 34, height: 34)
                    Image(systemName: scene.kind.symbol)
                        .font(.system(size: 12, weight: .black))
                        .foregroundStyle(Tokens.onPrimary)
                }
                .overlay {
                    if active {
                        Circle()
                            .strokeBorder(Tokens.progressBlue.opacity(0.25), lineWidth: 5)
                            .frame(width: 44, height: 44)
                    }
                }
                .accessibilityHidden(true)

                if !isLast {
                    Rectangle()
                        .fill(Tokens.lineStrong)
                        .frame(width: 2)
                        .frame(minHeight: 88)
                        .accessibilityHidden(true)
                }
            }
            .frame(width: 44)

            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                Text(scene.kind.label)
                    .font(.mMicro)
                    .foregroundStyle(nodeTextColor(scene.kind))
                Text(scene.title)
                    .font(.mBodyB)
                    .foregroundStyle(Tokens.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(scene.subtitle)
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)

                DisclosureGroup(
                    isExpanded: Binding(
                        get: { expandedSceneIDs.contains(scene.id) },
                        set: { expanded in
                            if expanded { expandedSceneIDs.insert(scene.id) }
                            else { expandedSceneIDs.remove(scene.id) }
                        }
                    )
                ) {
                    Text(scene.narration)
                        .font(.mCallout)
                        .foregroundStyle(Tokens.text2)
                        .lineSpacing(7)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(Tokens.Space.s4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                        .overlay {
                            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                .strokeBorder(Tokens.line, lineWidth: 1)
                        }
                } label: {
                    Text(expandedSceneIDs.contains(scene.id) ? "해설 원문 접기" : "해설 원문 읽기")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text2)
                        .frame(minHeight: 44, alignment: .leading)
                }
                .tint(Tokens.progressBlue)
            }
            .padding(.bottom, isLast ? 0 : Tokens.Space.s5)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("\(scene.kind.label), \(scene.title). \(scene.subtitle)")
            .accessibilityValue(active ? "현재 음성 장면" : "")
        }
    }

    private var unavailableStory: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            Text("풀이 기억선")
                .font(.mMicro)
                .foregroundStyle(Tokens.progressBlue)
            Text("5분 해설은 편집 중입니다")
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
            Text("검수된 원고가 준비되기 전에는 자동으로 만든 해설을 보여주지 않습니다.")
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            HStack(alignment: .top, spacing: Tokens.Space.s3) {
                Image(systemName: "book.closed")
                    .foregroundStyle(Tokens.progressBlue)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                    Text("기존 개념 학습은 그대로 이어갈 수 있습니다.")
                        .font(.mBodyB)
                        .foregroundStyle(Tokens.ink)
                    Text("아래 핵심 설명과 시각 학습, 연습 문제를 이용해 주세요. 검수를 마친 해설만 이 기억선에 추가됩니다.")
                        .font(.mCallout)
                        .foregroundStyle(Tokens.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(Tokens.Space.s4)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
        }
        .padding(Tokens.Space.s6)
        .background(Tokens.paper, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .strokeBorder(Tokens.lineStrong, lineWidth: 1)
        }
        .accessibilityIdentifier("curriculum-story-unavailable")
    }

    private func nodeColor(_ kind: CurriculumStorySceneKind) -> Color {
        switch kind {
        case .intuition: Tokens.progressBlue
        case .question: Tokens.actionPrimary
        case .misconception: Tokens.warningInk
        case .solution: Tokens.primaryDark
        case .recall: Tokens.successInk
        }
    }

    private func nodeTextColor(_ kind: CurriculumStorySceneKind) -> Color {
        switch kind {
        case .misconception: Tokens.warningInk
        case .recall: Tokens.successInk
        default: Tokens.progressBlue
        }
    }
}

enum CurriculumStoryCompactState: String {
    case current
    case next
    case locked
    case empty
    case completed

    var label: String {
        switch self {
        case .current: "현재 학습"
        case .next: "다음 학습"
        case .locked: "5분 해설 검수 중"
        case .empty: "프리뷰 없음"
        case .completed: "학습 완료"
        }
    }

    var symbol: String {
        switch self {
        case .current: "play.fill"
        case .next: "arrow.right"
        case .locked: "lock.fill"
        case .empty: "diamond"
        case .completed: "checkmark"
        }
    }

    var foreground: Color {
        switch self {
        case .current, .next: Tokens.primaryDark
        case .locked: Tokens.warningInk
        case .empty: Tokens.text2
        case .completed: Tokens.successInk
        }
    }

    var background: Color {
        switch self {
        case .current, .next: Tokens.primarySoft
        case .locked: Tokens.warningSoft
        case .empty: Tokens.paper2
        case .completed: Tokens.successSoft
        }
    }
}

struct CurriculumStoryCompactPreviewModel {
    let state: CurriculumStoryCompactState
    let story: CurriculumStudentStory?
    let courseTitle: String?
    let unitTitle: String?
    let conceptID: String?
    let conceptTitle: String?
    let estimatedMinutes: Int?
    let progress: Int?
    let message: String

    var actionLabel: String {
        guard conceptID != nil else { return "" }
        return (progress ?? 0) > 0 ? "이어서 학습" : "개념 시작"
    }
}

/// 개념 상세의 검수된 5장면을 제목·부제만으로 축약한 상단 기억선이다.
/// narration Text와 음성 플레이어를 만들지 않아 220개 장문 SwiftUI가 생길 수 없다.
struct CurriculumStoryCompactPreview: View {
    let model: CurriculumStoryCompactPreviewModel
    let onOpen: () -> Void

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var usesVerticalRail: Bool {
        horizontalSizeClass == .compact || dynamicTypeSize.isAccessibilitySize
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            heading

            if let story = model.story, story.scenes.count == 5 {
                Text(story.openingQuestion)
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)

                if usesVerticalRail {
                    verticalRail(story.scenes)
                } else {
                    horizontalRail(story.scenes)
                }
            } else {
                unavailableState
            }

            footer
        }
        .padding(Tokens.Space.s5)
        .background(Tokens.paper2, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .strokeBorder(Tokens.lineStrong, lineWidth: 1)
        }
        .accessibilityIdentifier("curriculum-top-story-preview")
        .transaction { transaction in
            if reduceMotion { transaction.animation = nil }
        }
    }

    private var heading: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: Tokens.Space.s4) {
                headingCopy
                Spacer(minLength: Tokens.Space.s3)
                stateBadge
            }

            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                headingCopy
                stateBadge
            }
        }
    }

    private var headingCopy: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text("5분 풀이 기억선")
                .font(.mMicro.weight(.bold))
                .foregroundStyle(Tokens.progressBlue)
            Text(model.conceptTitle ?? completedOrEmptyTitle)
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            if let courseTitle = model.courseTitle,
               let unitTitle = model.unitTitle,
               let estimatedMinutes = model.estimatedMinutes {
                Text("\(courseTitle) · \(unitTitle) · 예상 \(estimatedMinutes)분")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text3)
                    .multilineTextAlignment(.leading)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var stateBadge: some View {
        Label(model.state.label, systemImage: model.state.symbol)
            .font(.mCaption.weight(.bold))
            .foregroundStyle(model.state.foreground)
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 32)
            .background(model.state.background,
                        in: Capsule())
            .fixedSize(horizontal: false, vertical: true)
    }

    private var completedOrEmptyTitle: String {
        model.state == .completed
            ? "현재 학습 범위를 모두 마쳤습니다"
            : "다음 기억선을 준비하고 있습니다"
    }

    private func horizontalRail(_ scenes: [CurriculumStudentStoryScene]) -> some View {
        ZStack(alignment: .top) {
            Rectangle()
                .fill(Tokens.lineStrong)
                .frame(height: 2)
                .padding(.horizontal, 17)
                .padding(.top, 17)
                .accessibilityHidden(true)

            HStack(alignment: .top, spacing: Tokens.Space.s3) {
                ForEach(Array(scenes.enumerated()), id: \.element.id) { index, scene in
                    VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                        compactNode(scene.kind)
                        sceneCopy(scene)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(sceneAccessibilityLabel(scene, index: index))
                }
            }
        }
    }

    private func verticalRail(_ scenes: [CurriculumStudentStoryScene]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(scenes.enumerated()), id: \.element.id) { index, scene in
                HStack(alignment: .top, spacing: Tokens.Space.s3) {
                    VStack(spacing: 0) {
                        compactNode(scene.kind)
                        if index < scenes.count - 1 {
                            Rectangle()
                                .fill(Tokens.lineStrong)
                                .frame(width: 2)
                                .frame(minHeight: 52)
                                .accessibilityHidden(true)
                        }
                    }
                    .frame(width: 34)

                    sceneCopy(scene)
                        .padding(.bottom, index < scenes.count - 1 ? Tokens.Space.s4 : 0)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(sceneAccessibilityLabel(scene, index: index))
            }
        }
    }

    private func compactNode(_ kind: CurriculumStorySceneKind) -> some View {
        ZStack {
            Circle().fill(nodeColor(kind))
            Image(systemName: kind.symbol)
                .font(.system(size: 11, weight: .black))
                .foregroundStyle(Tokens.onPrimary)
        }
        .frame(width: 34, height: 34)
        .accessibilityHidden(true)
    }

    private func sceneCopy(_ scene: CurriculumStudentStoryScene) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(scene.kind.label)
                .font(.mMicro.weight(.bold))
                .foregroundStyle(nodeTextColor(scene.kind))
            Text(scene.title)
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
            Text(scene.subtitle)
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func sceneAccessibilityLabel(_ scene: CurriculumStudentStoryScene,
                                         index: Int) -> String {
        "\(index + 1)단계, \(scene.kind.label), \(scene.title). \(scene.subtitle)"
    }

    private var unavailableState: some View {
        HStack(alignment: .top, spacing: Tokens.Space.s3) {
            Image(systemName: model.state.symbol)
                .font(.mBodyB)
                .foregroundStyle(model.state.foreground)
                .frame(width: 34, height: 34)
                .background(model.state.background, in: Circle())
                .accessibilityHidden(true)
            Text(model.message)
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Tokens.Space.s4)
        .frame(maxWidth: .infinity, minHeight: 88, alignment: .leading)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(model.state.label). \(model.message)")
    }

    @ViewBuilder
    private var footer: some View {
        if model.conceptID != nil {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s4) {
                    footerMessage
                    Spacer(minLength: Tokens.Space.s3)
                    openButton
                        .fixedSize(horizontal: true, vertical: false)
                }
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    footerMessage
                    openButton
                }
            }
            .padding(.top, Tokens.Space.s4)
            .overlay(alignment: .top) { Divider().overlay(Tokens.line) }
        } else {
            EmptyView()
        }
    }

    private var footerMessage: some View {
        Text(model.story == nil
             ? "5분 해설 준비 여부와 관계없이 개념 학습은 바로 열 수 있습니다."
             : model.message)
            .font(.mCaption)
            .foregroundStyle(Tokens.text2)
            .multilineTextAlignment(.leading)
            .lineLimit(nil)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var openButton: some View {
        Button(action: onOpen) {
            HStack(spacing: Tokens.Space.s2) {
                Text(model.actionLabel)
                Image(systemName: "arrow.right")
                    .accessibilityHidden(true)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(PrimaryButtonStyle())
        .accessibilityLabel("\(model.conceptTitle ?? "개념") \(model.actionLabel)")
        .accessibilityHint("개념 상세와 5분 전체 해설을 엽니다")
    }

    private func nodeColor(_ kind: CurriculumStorySceneKind) -> Color {
        switch kind {
        case .intuition: Tokens.progressBlue
        case .question: Tokens.actionPrimary
        case .misconception: Tokens.warningInk
        case .solution: Tokens.primaryDark
        case .recall: Tokens.successInk
        }
    }

    private func nodeTextColor(_ kind: CurriculumStorySceneKind) -> Color {
        switch kind {
        case .misconception: Tokens.warningInk
        case .recall: Tokens.successInk
        default: Tokens.progressBlue
        }
    }
}
