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
