//  ConceptScreenV2.swift
//  Matths
//
//  개념 화면 v2 — 웹의 4단계: 01 개념 이해(성취기준·요약·스텝 카드)
//  → 02 시각 강의 → 03 플레이그라운드 → 04 문제풀이(유형 다양성 게이트).
//
//  원래 CurriculumHubScreen.swift 안에 죽은 허브 화면(CurriculumHubScreen·
//  FeaturedLearningTrack·CourseRowV2·UnitBlockV2·ConceptRowV2)과 한 파일로
//  섞여 있었다. 죽은 코드를 지우면서 살아있는 뷰들(RootView 가 쓰는 이 화면,
//  QuickPracticeScreen·WrongNoteRow 가 쓰는 KatexText, 이 화면이 쓰는
//  ProgressRing)만 여기로 옮겼다 — 파일 경계와 보존 계약을 일치시키기 위해.

import SwiftUI

/// 세리프 숫자 완성도 링 — 카드·글로우 없이 선 하나로
struct ProgressRing: View {
    let percent: Int

    var body: some View {
        ZStack {
            Circle().stroke(Tokens.line, lineWidth: 5)
            Circle()
                .trim(from: 0, to: CGFloat(percent) / 100)
                .stroke(Tokens.primary, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(percent)").font(.mStat).foregroundStyle(Tokens.ink)
        }
    }
}

// MARK: - 개념 화면 v2 (웹 4단계)

struct ConceptScreenV2: View {
    @EnvironmentObject private var store: AppStore
    @State private var lessonHeight: CGFloat = 420
    @State private var quizPassed = false
    @State private var summaryHeight: CGFloat = 60
    @State private var keyHeight: CGFloat = 60
    @State private var dwellStart: Date?

    var body: some View {
        if let id = store.selectedConceptV2ID,
           let (course, unit, concept) = CurriculumV2.concept(id) {
            content(course: course, unit: unit, concept: concept)
                .id(id)
                // 개념 체류 이벤트 — 대시보드 학습 분의 원천
                .onAppear { dwellStart = Date() }
                .onDisappear {
                    if let s = dwellStart {
                        let ms = Int(Date().timeIntervalSince(s) * 1000)
                        EventLog.append("concept-closed", conceptId: id, durationMs: ms)
                        // 서버로도 보낸다. 서버 eventType enum 은 이 값을 받는데
                        // 전송 배선만 없어서 체류 시간이 기기 안에만 쌓였다(감사 적발).
                        SyncEngine.shared.enqueueEvent("concept-closed", conceptId: id,
                                                       correct: nil, durationMs: ms)
                    }
                }
        } else {
            conceptStart
        }
    }

    /// 직접 좌표 없이 개념 탭으로 들어온 상태.
    ///
    /// 예전 화면은 아이콘·설명·버튼 하나를 화면 중앙에 띄워 iPad의 대부분을
    /// 빈 면으로 만들었다. 여기서는 진도 정본이 고른 실제 다음 개념을 먼저
    /// 보여 주고, 과목·단원·예상 시간·진도라는 선택 근거를 함께 준다.
    @ViewBuilder
    private var conceptStart: some View {
        if let (course, unit, concept) = store.progressV2.continueConcept() {
            let percent = store.progressV2.percent(for: concept)
            let minutes = concept.lesson?.estimatedMinutes ?? 15

            VStack(alignment: .leading, spacing: Tokens.Space.s8) {
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    Text("다음 학습")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.progressBlue)
                    Text(percent > 0 ? "멈춘 곳에서 바로 이어가세요" : "오늘 첫 개념을 시작하세요")
                        .font(.mTitle)
                        .foregroundStyle(Tokens.ink)
                    Text("13과목 전체를 훑지 않아도, 현재 진도에서 가장 먼저 이어갈 개념을 골랐습니다.")
                        .font(.mCallout)
                        .foregroundStyle(Tokens.text2)
                        .fixedSize(horizontal: false, vertical: true)
                    ExamRule()
                }

                HStack(alignment: .center, spacing: Tokens.Space.s6) {
                    ProgressRing(percent: percent)
                        .frame(width: 72, height: 72)

                    VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                        Text("\(course.title) · \(unit.title)")
                            .font(.mCaption)
                            .foregroundStyle(Tokens.text3)
                        Text(concept.title)
                            .font(.mHeading)
                            .foregroundStyle(Tokens.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Label("약 \(minutes)분", systemImage: "clock")
                            .font(.mCaption)
                            .foregroundStyle(Tokens.text2)
                    }
                }
                .padding(Tokens.Space.s6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
                .overlay {
                    RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                        .strokeBorder(Tokens.line, lineWidth: 1)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("다음 학습, \(course.title), \(unit.title), \(concept.title), 진도 \(percent)퍼센트, 약 \(minutes)분")

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    if let takeaway = concept.lesson?.keyTakeaway {
                        Text("이번에 잡을 핵심")
                            .font(.mMicro)
                            .foregroundStyle(Tokens.text3)
                        Text(MathText.plain(takeaway))
                            .font(.mBody)
                            .foregroundStyle(Tokens.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button(percent > 0 ? "이어서 학습" : "개념 시작") {
                        store.openConceptV2(concept.id)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: 360)

                    Button("13과목 학습 지도 보기") { store.route = .curriculum }
                        .buttonStyle(SecondaryButtonStyle())
                }
            }
            .frame(maxWidth: .infinity, minHeight: 520, alignment: .topLeading)
            .padding(.top, Tokens.Space.s6)
        } else {
            ContentUnavailableView(
                "모든 개념을 학습했어요",
                systemImage: "checkmark.seal",
                description: Text("학습 지도에서 완료한 개념을 다시 보거나 다른 과목을 복습할 수 있습니다."))
            Button("학습 지도 보기") { store.route = .curriculum }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 320)
        }
    }

    @ViewBuilder
    private func content(course: CourseV2, unit: UnitV2, concept: ConceptV2) -> some View {
        let progress = store.progressV2
        let pct = progress.percent(for: concept)

        VStack(alignment: .leading, spacing: Tokens.Space.s7) {
            // 머리 — 성취기준이 곧 학습 목표다
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                Button { store.route = .curriculum } label: {
                    Label("커리큘럼", systemImage: "chevron.left")
                        .font(.mCaption).foregroundStyle(Tokens.text3)
                }
                .buttonStyle(.plain)

                HStack(alignment: .lastTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("\(course.title) · \(unit.title)").font(.mMicro).foregroundStyle(Tokens.text3)
                        Text(concept.title).font(.mTitle).foregroundStyle(Tokens.ink)
                    }
                    Spacer()
                    ProgressRing(percent: pct).frame(width: 52, height: 52)
                }
                ExamRule()
                if let std = concept.achievementStandard {
                    (Text(concept.standardCode.map { "\($0) · " } ?? "").font(.mMicro).foregroundStyle(Tokens.text4)
                     + Text(std).font(.mCallout).foregroundStyle(Tokens.text2))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .entrance(0)

            // STEP 01 — 개념 이해 (레슨 시드가 있으면 요약·핵심·스텝 카드)
            if let lesson = concept.lesson {
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    SectionRule(title: "01 개념 이해 · 약 \(lesson.estimatedMinutes)분")
                    KatexText(text: lesson.summary, height: $summaryHeight)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("핵심 한 줄").font(.mMicro).foregroundStyle(Tokens.primary)
                        KatexText(text: lesson.keyTakeaway, height: $keyHeight)
                    }
                    .padding(Tokens.Space.s4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Tokens.primarySoft, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))

                    ForEach(lesson.steps, id: \.order) { step in
                        LessonStepRow(step: step)
                    }
                }
                .entrance(1)
            } else if let text = concept.legacy?.lessonText {
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    SectionRule(title: "01 개념 이해")
                    Text(text).font(.mBody).foregroundStyle(Tokens.ink).lineSpacing(6)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .entrance(1)
            }

            // 주제 체크리스트 — 진도의 30% (웹 topic 단위 진도)
            if !concept.topics.isEmpty {
                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    SectionRule(title: "학습 주제 · 진도의 30%")
                    ForEach(Array(concept.topics.enumerated()), id: \.offset) { i, topic in
                        TopicCheckRow(index: i, title: topic, concept: concept)
                    }
                }
                .entrance(2)
            }

            // STEP 02·03 — 시각 강의·플레이그라운드
            // 시나리오는 v2 개념 id 로 찾는다(scenarios-data.js). 레거시 웹 모듈이 있는
            // 개념은 놀이터·확인문제까지 붙으므로 그쪽 id 를 우선 넘긴다.
            if LessonWebView.hasLesson(conceptID: concept.id)
                || concept.legacy?.web == true || concept.legacy?.scene != nil {
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    SectionRule(title: "02·03 시각 강의 · 수학 놀이터")
                    LessonWebView(conceptID: concept.legacy?.appId ?? concept.id,
                                  height: $lessonHeight, quizPassed: $quizPassed)
                        .frame(height: lessonHeight)
                }
                .entrance(3)
            } else {
                // 전문 시각 모듈이 아직 없는 개념도 01 설명에서 바로 문제풀이로
                // 건너뛰지 않는다. 220개념에 모두 들어 있는 visualizationIdeas를
                // 실제 탐색 단계로 렌더해 학습 구조와 표현 방법을 한 번 더 확인한다.
                GenericConceptExplorer(concept: concept)
                    .entrance(3)
            }

            // STEP 04 — 문제풀이 · 유형 다양성 게이트 (진도의 60%)
            practiceSection(concept: concept)
                .entrance(4)

            // 완료 — 게이트 해금 후에만 (웹 masteryGate 규칙)
            completeSection(concept: concept)
                .entrance(5)
        }
    }

    @ViewBuilder
    private func practiceSection(concept: ConceptV2) -> some View {
        let progress = store.progressV2
        let required = progress.requiredDistinctTypes(for: concept)
        let got = progress.byConcept[concept.id]?.correctTypeIds.count ?? 0
        // 출제 경로는 **요구 유형 수와 같은 근거**로 정한다.
        // 예전엔 `!practiceTypes.isEmpty` 로 따로 판단해서, 웹 생성기가 10유형을
        // 요구하는 개념인데 출제는 네이티브 1~2유형으로만 나갔다 —
        // 아무리 풀어도 게이트가 안 열리는 벽이 됐다.
        let useWeb = progress.usesWebGenerator(concept)

        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionRule(title: "04 문제풀이 · 진도의 60%")
            if required > 0 {
                Text("서로 다른 유형 \(required)개를 맞히면 완료가 열립니다. 지금 \(got)/\(required).")
                    .font(.mCallout).foregroundStyle(Tokens.text2)
                Button("연습 문제 풀기") {
                    if !useWeb {
                        let types = concept.practiceTypes.compactMap(ProblemType.init(rawValue:))
                        guard !types.isEmpty else { return }
                        store.startExam(types: types, count: max(3, min(5, types.count)))
                        store.examSourceConceptV2ID = concept.id
                    } else {
                        // 웹 로컬 생성기 (WebGen) — 220개념 커버리지 확장의 핵심
                        store.startWebPractice(concept)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 240)
            } else {
                // 220개념 모두 출제 경로가 있어야 하므로 이 분기는 콘텐츠 준비 상태가
                // 아니라 번들 연결 실패다. 영구 미지원처럼 말하지 않고 복구 행동을 준다.
                Text("연습 자료를 불러오지 못했습니다. 앱을 다시 연 뒤에도 같으면 학습 지도에서 다른 개념을 선택해 주세요.")
                    .font(.mCallout).foregroundStyle(Tokens.warning)
            }
        }
    }

    @ViewBuilder
    private func completeSection(concept: ConceptV2) -> some View {
        let progress = store.progressV2
        let unlocked = progress.masteryUnlocked(for: concept)
        let completed = progress.byConcept[concept.id]?.userCompleted == true

        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            if completed {
                Label("학습 완료", systemImage: "checkmark.seal.fill")
                    .font(.mBodyB).foregroundStyle(Tokens.success)
            } else {
                Button("학습 완료로 표시") {
                    store.progressV2.setUserCompleted(true, concept: concept)
                    store.saveProgressV2()
                    if let (course, unit, _) = CurriculumV2.concept(concept.id) {
                        SyncEngine.shared.enqueueConceptCompletion(
                            courseId: course.id, unitId: unit.id, conceptId: concept.id)
                    }
                    // 구 진도에도 반영 — 과거 평가 기록과의 하위 호환 fallback이다.
                    if let appId = concept.legacy?.appId {
                        store.markConceptComplete(appId)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 260)
                .disabled(!unlocked)
                if !unlocked {
                    Text(progress.requiredDistinctTypes(for: concept) > 0
                         ? "완료하려면 위의 유형 게이트를 먼저 채우세요. 진도는 90%까지만 오릅니다."
                         : "연습 자료 연결을 확인한 뒤 완료할 수 있습니다.")
                        .font(.mCaption).foregroundStyle(Tokens.warning)
                }
            }
        }
    }
}

/// 전문 WebView 모듈이 없는 개념의 네이티브 탐색 단계.
///
/// 정적인 "준비 중" 안내가 아니라 curriculum-v2 정본의 시각화 아이디어를
/// 한 항목씩 읽고 전환하는 완결된 학습 표면이다. 자동 재생·무한 바운스는 없고,
/// 이전/다음 버튼은 44pt 이상이라 Split View와 Dynamic Type에서도 조작할 수 있다.
private struct GenericConceptExplorer: View {
    let concept: ConceptV2
    @State private var selectedIndex = 0

    private var ideas: [String] { concept.visualizationIdeas }
    private var safeIndex: Int {
        min(max(selectedIndex, 0), max(ideas.count - 1, 0))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            SectionRule(title: "02·03 개념 구조 탐색")

            if let idea = ideas.indices.contains(safeIndex) ? ideas[safeIndex] : nil {
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("탐색 \(safeIndex + 1)")
                            .font(.mCaption)
                            .foregroundStyle(Tokens.progressBlue)
                        Spacer()
                        Text("\(safeIndex + 1) / \(ideas.count)")
                            .font(.mMicro)
                            .foregroundStyle(Tokens.text3)
                            .monospacedDigit()
                    }

                    Text(idea)
                        .font(.mBodyB)
                        .foregroundStyle(Tokens.ink)
                        .fixedSize(horizontal: false, vertical: true)

                    if let lesson = concept.lesson {
                        Text(lesson.keyTakeaway)
                            .font(.mCallout)
                            .foregroundStyle(Tokens.text2)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    HStack(spacing: Tokens.Space.s2) {
                        ForEach(ideas.indices, id: \.self) { index in
                            Capsule()
                                .fill(index == safeIndex ? Tokens.progressBlue : Tokens.lineStrong)
                                .frame(maxWidth: .infinity)
                                .frame(height: 3)
                                .accessibilityHidden(true)
                        }
                    }
                }
                .padding(Tokens.Space.s4)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                .overlay {
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.line, lineWidth: 1)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("개념 탐색 \(safeIndex + 1)단계, \(idea)")

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: Tokens.Space.s3) { navigationButtons }
                    VStack(spacing: Tokens.Space.s2) { navigationButtons }
                }
            } else {
                Text("개념 설명을 확인한 뒤 연습 문제로 이어가세요.")
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
            }
        }
        .onChange(of: concept.id) { _, _ in selectedIndex = 0 }
    }

    @ViewBuilder
    private var navigationButtons: some View {
        Button("이전 탐색") {
            selectedIndex = max(0, safeIndex - 1)
        }
        .buttonStyle(SecondaryButtonStyle())
        .frame(maxWidth: .infinity, minHeight: 44)
        .disabled(safeIndex == 0)

        Button(safeIndex == ideas.count - 1 ? "탐색 완료" : "다음 탐색") {
            selectedIndex = min(max(ideas.count - 1, 0), safeIndex + 1)
        }
        .buttonStyle(PrimaryButtonStyle())
        .frame(maxWidth: .infinity, minHeight: 44)
        .disabled(ideas.isEmpty || safeIndex == ideas.count - 1)
    }
}

struct LessonStepRow: View {
    let step: LessonStepV2
    @State private var height: CGFloat = 40

    var body: some View {
        HStack(alignment: .top, spacing: Tokens.Space.s3) {
            CircledNumber(n: step.order)
            VStack(alignment: .leading, spacing: 3) {
                Text(step.title).font(.mBodyB).foregroundStyle(Tokens.ink)
                KatexText(text: step.description, height: $height)
            }
        }
        .padding(.vertical, Tokens.Space.s2)
    }
}

struct TopicCheckRow: View {
    let index: Int
    let title: String
    let concept: ConceptV2
    @EnvironmentObject private var store: AppStore

    var body: some View {
        let done = store.progressV2.byConcept[concept.id]?.completedTopicIndexes.contains(index) == true
        Button {
            store.progressV2.toggleTopic(index, concept: concept)
            store.saveProgressV2()
            // 토글이므로 켠 것과 끈 것을 구분해 보낸다 — 서버 enum 에 둘 다 있다.
            // (done 은 토글 **전** 상태라, 지금 켜졌는지는 그 반대다)
            let nowOn = !done
            let type = nowOn ? "topic-completed" : "topic-uncompleted"
            EventLog.append(type, conceptId: concept.id)
            if let (course, unit, _) = CurriculumV2.concept(concept.id) {
                SyncEngine.shared.enqueueTopic(
                    courseId: course.id, unitId: unit.id, conceptId: concept.id,
                    topicIndex: index, completed: nowOn)
            }
        } label: {
            HStack(spacing: Tokens.Space.s3) {
                Image(systemName: done ? "checkmark.square.fill" : "square")
                    .font(.mBody).foregroundStyle(done ? Tokens.primary : Tokens.text4)
                Text(title).font(.mBody)
                    .foregroundStyle(done ? Tokens.text3 : Tokens.ink)
                    .strikethrough(done, color: Tokens.text4)
                Spacer()
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// $...$ 수식이 섞인 문장을 KaTeX 로 렌더 — problem.html 재사용 (선지 없이 발제문만)
struct KatexText: View {
    let text: String
    @Binding var height: CGFloat
    @State private var picked: String?

    var body: some View {
        ProblemWebView(
            problem: GeneratedProblem(
                id: "lesson-\(text.hashValue)", typeKey: "lesson", typeName: "lesson",
                unit: "", statement: text, answer: "", steps: [], minutes: 0,
                choices: nil, isTex: true),
            height: $height, pickedKey: $picked)
            .frame(height: height)
    }
}
