//  CurriculumV2MapScreen.swift
//  Matths
//
//  2022 개정 교육과정 13과목·220개념의 실제 진입 화면.
//  구 5과목 curriculum.json은 평가 호환용으로만 남기고, 학생이 보는 지도와
//  진도는 웹과 같은 curriculum-v2.json / ProgressV2Store를 사용한다.

import SwiftUI

/// CurriculumV2/AssessmentV2 정본을 화면에 읽기 좋게 투영하는 상태값이다.
/// 저장하거나 해금 판정에 다시 사용하지 않는다.
private enum CurriculumAssessmentDisplayState {
    case available, inProgress, completed, locked, unsupported

    var systemImage: String {
        switch self {
        case .available:   return "flag.fill"
        case .inProgress:  return "pencil.circle.fill"
        case .completed:   return "checkmark.seal.fill"
        case .locked:      return "lock.fill"
        case .unsupported: return "info.circle.fill"
        }
    }

    var foreground: Color {
        switch self {
        // actionPrimary는 10% 바이올렛 면 위에서 작은 글자 대비가 4.5:1 아래다.
        // 상태는 아이콘+문구로 이미 전달하므로 이 면에서는 본문 잉크를 쓴다.
        case .available, .inProgress: return Tokens.ink
        case .completed:              return Tokens.successInk
        case .locked:                 return Tokens.warningInk
        case .unsupported:            return Tokens.text2
        }
    }

    var background: Color {
        switch self {
        case .available, .inProgress: return Tokens.actionPrimary.opacity(0.10)
        case .completed:              return Tokens.successSoft
        case .locked:                 return Tokens.warningSoft
        case .unsupported:            return Tokens.paper2
        }
    }
}

private struct CurriculumAssessmentProjection {
    let state: CurriculumAssessmentDisplayState
    let title: String
    let detail: String
}

private enum CurriculumConceptDisplayState {
    case current(percent: Int), completed, available

    var label: String {
        switch self {
        case .current(let percent): return percent > 0 ? "현재 학습 · \(percent)%" : "현재 학습"
        case .completed:            return "학습 완료"
        case .available:            return "학습 가능"
        }
    }

    var systemImage: String {
        switch self {
        case .current:   return "play.fill"
        case .completed: return "checkmark"
        case .available: return "lock.open.fill"
        }
    }

    var foreground: Color {
        switch self {
        case .current:   return Tokens.actionPrimary
        case .completed: return Tokens.successInk
        case .available: return Tokens.text2
        }
    }

    var background: Color {
        switch self {
        case .current:   return Tokens.actionPrimary.opacity(0.12)
        case .completed: return Tokens.successSoft
        case .available: return Tokens.paper2
        }
    }
}

struct CurriculumV2MapScreen: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var courses: [CourseV2] { CurriculumV2.data.courses }
    private var selectedCourse: CourseV2 {
        courses.first { $0.id == store.selectedCourseV2ID }
            ?? courses.first
            ?? CourseV2(id: "empty", title: "과목 없음", category: "common",
                        order: 0, prerequisites: [], recommendedGrades: [], units: [])
    }

    var body: some View {
        GeometryReader { geometry in
            if let loadError = CurriculumV2.loadError {
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.mTitle)
                        .foregroundStyle(Tokens.warningInk)
                    Text("커리큘럼을 열지 못했습니다")
                        .font(.mTitle)
                        .foregroundStyle(Tokens.ink)
                    Text(loadError)
                        .font(.mBody)
                        .foregroundStyle(Tokens.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .readableWidth(680)
                .adaptiveHPadding()
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.vertical, Tokens.Space.s8)
            } else {
                let split = geometry.size.width >= 760 && !dynamicTypeSize.isAccessibilitySize
                let narrow = geometry.size.width <= 360
                Group {
                    if split {
                        HStack(spacing: 0) {
                            courseSidebar
                                .frame(width: 248)
                            Divider()
                            courseScroll(compact: false, narrow: false)
                        }
                    } else {
                        courseScroll(compact: true, narrow: narrow)
                    }
                }
            }
        }
        .background(Tokens.paper)
        .onAppear {
            if store.selectedCourseV2ID == nil {
                store.selectedCourseV2ID = courses.first?.id
            }
        }
        // 반복 모션은 없으며, 시스템/앱 모션 설정이 꺼진 경우 상위에서
        // 전달된 암묵 애니메이션도 이 화면 안에서는 즉시 반영한다.
        .transaction { transaction in
            if reduceMotion || !store.motionOn { transaction.animation = nil }
        }
    }

    private var courseSidebar: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Tokens.Space.s6) {
                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    Text("과목 선택")
                        .font(.mHeading)
                        .foregroundStyle(Tokens.ink)
                    Text("13과목 · 220개념")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text3)
                }

                ForEach(CurriculumV2.data.categories) { category in
                    let categoryCourses = courses.filter { $0.category == category.id }
                    if !categoryCourses.isEmpty {
                        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                            Text(category.title)
                                .font(.mMicro.weight(.bold))
                                .foregroundStyle(Tokens.text3)
                                .accessibilityAddTraits(.isHeader)

                            ForEach(categoryCourses) { course in
                                courseButton(course)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s6)
            .padding(.bottom, 88)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .vertical)
    }

    private func courseButton(_ course: CourseV2) -> some View {
        let selected = course.id == selectedCourse.id
        let percent = store.progressV2.coursePercent(course)
        return Button {
            store.selectedCourseV2ID = course.id
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s2) {
                    Text(course.title)
                        .font(selected ? .mBodyB : .mBody)
                        .foregroundStyle(selected ? Tokens.ink : Tokens.text2)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: Tokens.Space.s2)
                    Text("\(percent)%")
                        .font(.mCaption.monospacedDigit())
                        .foregroundStyle(selected ? Tokens.actionPrimary : Tokens.text3)
                }
                ProgressBar(value: Double(percent) / 100,
                            tint: selected ? Tokens.actionPrimary : Tokens.progressBlue)
                    .frame(height: 4)
            }
            .padding(.horizontal, Tokens.Space.s3)
            .padding(.vertical, Tokens.Space.s3)
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .background(selected ? Tokens.actionPrimary.opacity(0.10) : Color.clear,
                        in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(course.title), 진도 \(percent)퍼센트")
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    private func courseScroll(compact: Bool, narrow: Bool) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Tokens.Space.s7) {
                pageHeader
                if compact { compactCoursePicker }
                courseHeader(selectedCourse)
                learningTracksSection(course: selectedCourse)
                if let next = nextConcept(in: selectedCourse) {
                    continueCard(course: selectedCourse, concept: next)
                }
                ForEach(Array(selectedCourse.units.enumerated()), id: \.element.id) { index, unit in
                    unitSection(course: selectedCourse, unit: unit, index: index)
                }
            }
            .frame(maxWidth: Tokens.readableWidth, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, narrow ? Tokens.Space.s3 : compact ? Tokens.Space.s4 : Tokens.Space.s8)
            .padding(.vertical, Tokens.Space.s8)
            .padding(.bottom, 88)
        }
        .scrollDismissesKeyboard(.interactively)
        .scrollBounceBehavior(.basedOnSize, axes: .vertical)
    }

    private var pageHeader: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            Text("커리큘럼")
                .font(.mTitle)
                .foregroundStyle(Tokens.ink)
                .accessibilityAddTraits(.isHeader)
            Text("2022 개정 교육과정의 13과목 220개념을 자유롭게 선택해 학습합니다.")
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
            ExamRule()
        }
    }

    private var compactCoursePicker: some View {
        Menu {
            ForEach(CurriculumV2.data.categories) { category in
                let categoryCourses = courses.filter { $0.category == category.id }
                if !categoryCourses.isEmpty {
                    Section(category.title) {
                        ForEach(categoryCourses) { course in
                            Button {
                                store.selectedCourseV2ID = course.id
                            } label: {
                                if course.id == selectedCourse.id {
                                    Label(course.title, systemImage: "checkmark")
                                } else {
                                    Text(course.title)
                                }
                            }
                        }
                    }
                }
            }
        } label: {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                        coursePickerCopy
                        Label("과목 바꾸기", systemImage: "chevron.up.chevron.down")
                            .font(.mCaption)
                            .foregroundStyle(Tokens.actionPrimary)
                    }
                } else {
                    HStack(spacing: Tokens.Space.s3) {
                        coursePickerCopy
                        Spacer(minLength: Tokens.Space.s3)
                        Image(systemName: "chevron.up.chevron.down")
                            .foregroundStyle(Tokens.actionPrimary)
                    }
                }
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s3)
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Tokens.line))
        }
        .accessibilityLabel("과목 선택, 현재 \(selectedCourse.title)")
        .accessibilityHint("13과목 목록을 엽니다")
    }

    private var coursePickerCopy: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(categoryTitle(selectedCourse.category))
                .font(.mMicro.weight(.bold))
                .foregroundStyle(Tokens.text3)
            Text(selectedCourse.title)
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func courseHeader(_ course: CourseV2) -> some View {
        let percent = store.progressV2.coursePercent(course)
        let completed = course.allConcepts.filter {
            store.progressV2.percent(for: $0) >= 100
        }.count
        let totalMinutes = course.allConcepts.reduce(0) {
            $0 + ($1.lesson?.estimatedMinutes ?? 15)
        }
        let prerequisiteTitles = course.prerequisites.compactMap { prerequisiteID in
            courses.first { $0.id == prerequisiteID }?.title
        }
        return VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                Text("\(categoryTitle(course.category)) · \(gradeLabel(course.recommendedGrades))")
                    .font(.mMicro.weight(.bold))
                    .foregroundStyle(Tokens.actionPrimary)
                Text(course.title)
                    .font(.mTitle)
                    .foregroundStyle(Tokens.ink)
                    .multilineTextAlignment(.leading)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                Text("\(course.units.count)개 단원 · \(course.allConcepts.count)개 개념 · \(estimatedTimeLabel(totalMinutes))")
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                        Text("\(completed)/\(course.allConcepts.count) 완료 · \(percent)%")
                            .font(.mCaption.monospacedDigit())
                            .foregroundStyle(Tokens.text2)
                        ProgressBar(value: Double(percent) / 100, tint: Tokens.actionPrimary)
                    }
                } else {
                    HStack(spacing: Tokens.Space.s4) {
                        ProgressBar(value: Double(percent) / 100, tint: Tokens.actionPrimary)
                        Text("\(completed)/\(course.allConcepts.count) 완료 · \(percent)%")
                            .font(.mCaption.monospacedDigit())
                            .foregroundStyle(Tokens.text2)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                conceptStateLegend
                Label("모든 개념은 바로 학습할 수 있습니다", systemImage: "lock.open.fill")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.ink)
                Text("개념 학습에는 잠금이 없고, 평가 응시 조건만 별도로 적용됩니다.")
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
                if !prerequisiteTitles.isEmpty {
                    Label("권장 선수 과목", systemImage: "point.3.connected.trianglepath.dotted")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.ink)
                    Text(prerequisiteSummary(for: course))
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text2)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("선수 과목은 권장 순서이며 이 과목의 개념 진입을 막지 않습니다.")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            assessmentGatePanel(for: course)
        }
        .padding(Tokens.Space.s5)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Tokens.line))
    }

    private var conceptStateLegend: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Tokens.Space.s4) {
                legendItem("현재 학습", systemImage: "play.circle.fill", color: Tokens.actionPrimary)
                legendItem("학습 완료", systemImage: "checkmark.circle.fill", color: Tokens.successInk)
                legendItem("학습 가능", systemImage: "lock.open.fill", color: Tokens.text2)
            }
            .fixedSize(horizontal: true, vertical: false)

            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                legendItem("현재 학습", systemImage: "play.circle.fill", color: Tokens.actionPrimary)
                legendItem("학습 완료", systemImage: "checkmark.circle.fill", color: Tokens.successInk)
                legendItem("학습 가능", systemImage: "lock.open.fill", color: Tokens.text2)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("상태 안내. 현재 학습, 학습 완료, 학습 가능")
    }

    private func legendItem(_ title: String, systemImage: String, color: Color) -> some View {
        Label(title, systemImage: systemImage)
            .font(.mCaption)
            .foregroundStyle(color)
    }

    private func prerequisiteSummary(for course: CourseV2) -> String {
        course.prerequisites.compactMap { prerequisiteID in
            guard let prerequisite = courses.first(where: { $0.id == prerequisiteID }) else {
                return nil
            }
            let percent = store.progressV2.coursePercent(prerequisite)
            return percent >= 100
                ? "\(prerequisite.title) 완료"
                : "\(prerequisite.title) \(percent)%"
        }.joined(separator: " · ")
    }

    private func assessmentGatePanel(for course: CourseV2) -> some View {
        let projection = assessmentGateProjection(for: course)
        return HStack(alignment: .top, spacing: Tokens.Space.s3) {
            Image(systemName: projection.state.systemImage)
                .font(.mBodyB)
                .foregroundStyle(projection.state.foreground)
                .frame(width: 24, height: 24, alignment: .top)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(projection.title)
                    .font(.mBodyB)
                    .foregroundStyle(projection.state.foreground)
                    .multilineTextAlignment(.leading)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                Text(projection.detail)
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
                    .multilineTextAlignment(.leading)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(Tokens.Space.s4)
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .background(projection.state.background,
                    in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(projection.title). \(projection.detail)")
    }

    /// 평가센터의 기존 해금 규칙을 읽어 이 화면에 설명만 투영한다.
    /// 개념 Button은 어떤 경우에도 비활성화하지 않는다.
    private func assessmentGateProjection(for course: CourseV2) -> CurriculumAssessmentProjection {
        guard let assessmentCourse = AssessCatalog.course(course.id) else {
            return CurriculumAssessmentProjection(
                state: .unsupported,
                title: "단계 평가 미지원",
                detail: "이 과목은 정식 단계 평가 카탈로그에 없습니다. 개념 학습과 연습은 모두 바로 이용할 수 있습니다."
            )
        }

        if store.coursePassedV2(course.id) {
            return CurriculumAssessmentProjection(
                state: .completed,
                title: "평가 완료 · \(course.title)",
                detail: "과목 종합평가를 통과했습니다. 완료한 개념도 언제든 다시 학습할 수 있습니다."
            )
        }

        var candidates: [CurriculumAssessmentProjection] = []

        func candidate(scopeKey: String,
                       title: String,
                       unlocked: Bool,
                       unlockedDetail: String,
                       lockDetail: String) -> CurriculumAssessmentProjection? {
            if store.attemptsV2.passed(scopeKey: scopeKey) { return nil }
            if store.attemptsV2.openAttempt(scopeKey: scopeKey) != nil {
                return CurriculumAssessmentProjection(
                    state: .inProgress,
                    title: "평가 진행 중 · \(title)",
                    detail: "작성 중인 답안이 저장되어 있습니다. 평가센터에서 이어서 응시할 수 있습니다."
                )
            }
            if unlocked {
                return CurriculumAssessmentProjection(
                    state: .available,
                    title: "평가 가능 · \(title)",
                    detail: unlockedDetail
                )
            }
            return CurriculumAssessmentProjection(
                state: .locked,
                title: "평가 잠김 · \(title)",
                detail: lockDetail
            )
        }

        for unit in assessmentCourse.units {
            for subunit in unit.subunits {
                let done = subunit.conceptIds.filter(conceptDoneForAssessment).count
                let scopeKey = "subunit/\(assessmentCourse.courseId)/\(unit.unitId)/\(subunit.id)"
                if let row = candidate(
                    scopeKey: scopeKey,
                    title: "\(subunit.title) 중간평가",
                    unlocked: done == subunit.conceptIds.count,
                    unlockedDetail: "연결 개념 \(done)/\(subunit.conceptIds.count)개를 완료해 응시 조건을 충족했습니다.",
                    lockDetail: "잠금 이유 · 연결 개념 \(done)/\(subunit.conceptIds.count)개 완료. 남은 개념을 완료하면 열립니다."
                ) {
                    candidates.append(row)
                }
            }

            let conceptIDs = unit.subunits.flatMap(\.conceptIds)
            let conceptDoneCount = conceptIDs.filter(conceptDoneForAssessment).count
            let passedSubunits = unit.subunits.filter {
                store.attemptsV2.passed(
                    scopeKey: "subunit/\(assessmentCourse.courseId)/\(unit.unitId)/\($0.id)"
                )
            }.count
            let conceptsDone = conceptDoneCount == conceptIDs.count
            let subunitsPassed = passedSubunits == unit.subunits.count
            let unitLockDetail = conceptsDone
                ? "잠금 이유 · 소단원 중간평가 \(passedSubunits)/\(unit.subunits.count)개 통과. 모두 통과하면 열립니다."
                : "잠금 이유 · 대단원 개념 \(conceptDoneCount)/\(conceptIDs.count)개 완료. 모두 완료하면 열립니다."
            if let row = candidate(
                scopeKey: "unit/\(assessmentCourse.courseId)/\(unit.unitId)/-",
                title: "\(unit.title) 기말평가",
                unlocked: conceptsDone && subunitsPassed,
                unlockedDetail: "대단원 개념과 소단원 중간평가를 모두 완료해 응시 조건을 충족했습니다.",
                lockDetail: unitLockDetail
            ) {
                candidates.append(row)
            }
        }

        let passedUnits = assessmentCourse.units.filter {
            store.attemptsV2.passed(
                scopeKey: "unit/\(assessmentCourse.courseId)/\($0.unitId)/-"
            )
        }.count
        if let courseRow = candidate(
            scopeKey: "course/\(assessmentCourse.courseId)/-/-",
            title: "\(course.title) 과목 종합평가",
            unlocked: passedUnits == assessmentCourse.units.count,
            unlockedDetail: "모든 대단원 기말평가를 통과해 종합평가 응시 조건을 충족했습니다.",
            lockDetail: "잠금 이유 · 대단원 기말평가 \(passedUnits)/\(assessmentCourse.units.count)개 통과. 모두 통과하면 열립니다."
        ) {
            candidates.append(courseRow)
        }

        return candidates.first { $0.state == .inProgress }
            ?? candidates.first { $0.state == .available }
            ?? candidates.first { $0.state == .locked }
            ?? CurriculumAssessmentProjection(
                state: .completed,
                title: "평가 완료 · \(course.title)",
                detail: "이 과목의 단계 평가를 모두 통과했습니다."
            )
    }

    private func conceptDoneForAssessment(_ conceptID: String) -> Bool {
        guard let (_, _, concept) = CurriculumV2.concept(conceptID) else { return false }
        if store.progressV2.percent(for: concept) >= 100 { return true }
        if let legacyID = concept.legacy?.appId {
            return store.completedConceptIDs.contains(legacyID)
        }
        return false
    }

    private func continueCard(course: CourseV2, concept: ConceptV2) -> some View {
        let percent = store.progressV2.percent(for: concept)
        return Button {
            store.openConceptV2(concept.id)
        } label: {
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                            Label(percent > 0 ? "이어서 학습" : "현재 학습", systemImage: "arrow.right.circle.fill")
                                .foregroundStyle(Tokens.actionPrimary)
                            Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                .foregroundStyle(Tokens.text3)
                                .monospacedDigit()
                        }
                        .font(.mCaption.weight(.bold))
                    } else {
                        HStack {
                            Label(percent > 0 ? "이어서 학습" : "현재 학습", systemImage: "arrow.right.circle.fill")
                                .font(.mCaption.weight(.bold))
                                .foregroundStyle(Tokens.actionPrimary)
                            Spacer(minLength: Tokens.Space.s3)
                            Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                .font(.mCaption.monospacedDigit())
                                .foregroundStyle(Tokens.text3)
                        }
                    }
                }
                Text(concept.title)
                    .font(.mHeading)
                    .foregroundStyle(Tokens.ink)
                    .multilineTextAlignment(.leading)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                Text(concept.lesson?.summary ?? concept.achievementStandard ?? "개념 학습을 시작합니다.")
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .multilineTextAlignment(.leading)
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(Tokens.Space.s5)
            .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
            .background(Tokens.actionPrimary.opacity(0.10),
                        in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .stroke(Tokens.actionPrimary, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(percent > 0 ? "이어서 학습" : "현재 학습"), \(concept.title), 진도 \(percent)퍼센트, 예상 \(concept.lesson?.estimatedMinutes ?? 15)분, 잠금 없음")
        .accessibilityHint("개념 강의 화면을 엽니다")
    }

    @ViewBuilder
    private func learningTracksSection(course: CourseV2) -> some View {
        let tracks = CurriculumV2.data.learningTracks
            .filter { $0.courseId == course.id }
            .sorted { $0.order < $1.order }
        if !tracks.isEmpty {
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                    Text("추천 학습 코스")
                        .font(.mHeading)
                        .foregroundStyle(Tokens.ink)
                    Text("관련 개념을 실제 선후 흐름으로 묶었습니다. 모든 개념은 코스 밖에서도 자유롭게 열 수 있습니다.")
                        .font(.mCallout)
                        .foregroundStyle(Tokens.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }

                ForEach(tracks) { track in
                    learningTrackCard(track)
                }
            }
        }
    }

    private func learningTrackCard(_ track: LearningTrackV2) -> some View {
        let concepts = CurriculumV2.concepts(in: track)
        let completed = concepts.filter { store.progressV2.percent(for: $0) >= 100 }.count
        let next = concepts.first { store.progressV2.percent(for: $0) < 100 } ?? concepts.first
        let totalMinutes = concepts.reduce(0) { $0 + ($1.lesson?.estimatedMinutes ?? 15) }
        return Button {
            if let next { store.openConceptV2(next.id) }
        } label: {
            VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                            trackHeading(track, completed: completed, total: concepts.count)
                            Text(estimatedTimeLabel(totalMinutes))
                                .font(.mCaption.monospacedDigit())
                                .foregroundStyle(Tokens.text3)
                        }
                    } else {
                        HStack(alignment: .top, spacing: Tokens.Space.s4) {
                            trackHeading(track, completed: completed, total: concepts.count)
                            Spacer(minLength: Tokens.Space.s4)
                            Text(estimatedTimeLabel(totalMinutes))
                                .font(.mCaption.monospacedDigit())
                                .foregroundStyle(Tokens.text3)
                        }
                    }
                }

                Text(track.summary)
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    ForEach(Array(concepts.enumerated()), id: \.element.id) { index, concept in
                        learningTrackConceptRow(
                            concept,
                            index: index,
                            concepts: concepts,
                            currentConceptID: next?.id
                        )
                    }
                }

                HStack(spacing: Tokens.Space.s2) {
                    Text(completed >= concepts.count ? "코스 다시 보기" : completed > 0 ? "이어서 학습" : "코스 시작")
                        .font(.mBodyB)
                    Image(systemName: "arrow.right")
                        .accessibilityHidden(true)
                }
                .foregroundStyle(Tokens.actionPrimary)
            }
            .padding(Tokens.Space.s5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Tokens.progressBlue)
                    .frame(width: 4)
                    .padding(.vertical, Tokens.Space.s4)
            }
            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Tokens.line))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(next == nil)
        .accessibilityLabel("추천 학습 코스, \(track.title), \(completed)개 완료, 전체 \(concepts.count)개, \(estimatedTimeLabel(totalMinutes)), 다음 학습 \(next?.title ?? "없음")")
        .accessibilityHint(completed >= concepts.count
            ? "첫 개념부터 다시 엽니다"
            : "다음 학습할 개념을 엽니다. 코스의 직전 개념은 권장 선수 개념입니다")
    }

    private func learningTrackConceptRow(_ concept: ConceptV2,
                                         index: Int,
                                         concepts: [ConceptV2],
                                         currentConceptID: String?) -> some View {
        let state = conceptDisplayState(for: concept, currentConceptID: currentConceptID)
        let prerequisite = index > 0 ? concepts[index - 1] : nil
        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    conceptStateLabel(state)
                    trackConceptCopy(concept, prerequisite: prerequisite)
                    Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                        .font(.mCaption.monospacedDigit())
                        .foregroundStyle(Tokens.text3)
                }
            } else {
                HStack(alignment: .top, spacing: Tokens.Space.s3) {
                    conceptStateGlyph(state, ordinal: index + 1, size: 30)
                    VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                        trackConceptCopy(concept, prerequisite: prerequisite)
                        HStack(spacing: Tokens.Space.s2) {
                            Text(state.label)
                                .foregroundStyle(state.foreground)
                            Text("·")
                                .accessibilityHidden(true)
                            Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                .foregroundStyle(Tokens.text3)
                                .monospacedDigit()
                        }
                        .font(.mCaption)
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .padding(.vertical, Tokens.Space.s1)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(trackConceptAccessibilityLabel(
            concept,
            state: state,
            prerequisite: prerequisite
        ))
    }

    private func trackConceptCopy(_ concept: ConceptV2, prerequisite: ConceptV2?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(concept.title)
                .font(.mBody)
                .foregroundStyle(Tokens.ink)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
            Text(prerequisite.map { "권장 선수 개념 · \($0.title)" } ?? "코스 출발 개념")
                .font(.mMicro)
                .foregroundStyle(Tokens.text3)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func trackConceptAccessibilityLabel(_ concept: ConceptV2,
                                                state: CurriculumConceptDisplayState,
                                                prerequisite: ConceptV2?) -> String {
        let prerequisiteLabel = prerequisite.map { "권장 선수 개념 \($0.title)" } ?? "코스 출발 개념"
        return "\(concept.title), \(state.label), \(prerequisiteLabel), 예상 \(concept.lesson?.estimatedMinutes ?? 15)분, 잠금 없음"
    }

    private func conceptDisplayState(for concept: ConceptV2,
                                     currentConceptID: String?) -> CurriculumConceptDisplayState {
        let percent = store.progressV2.percent(for: concept)
        if percent >= 100 { return .completed }
        if percent > 0 || concept.id == currentConceptID { return .current(percent: percent) }
        return .available
    }

    private func conceptStateLabel(_ state: CurriculumConceptDisplayState) -> some View {
        Label(state.label, systemImage: state.systemImage)
            .font(.mCaption)
            .foregroundStyle(state.foreground)
    }

    private func conceptStateGlyph(_ state: CurriculumConceptDisplayState,
                                   ordinal: Int,
                                   size: CGFloat) -> some View {
        ZStack {
            Circle().fill(state.background)
            if case .available = state {
                Text("\(ordinal)")
                    .font(.mCaption.monospacedDigit().weight(.bold))
                    .foregroundStyle(state.foreground)
            } else {
                Image(systemName: state.systemImage)
                    .font(.mCaption.weight(.bold))
                    .foregroundStyle(state.foreground)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private func trackHeading(_ track: LearningTrackV2, completed: Int, total: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(track.eyebrow)
                .font(.mMicro.weight(.bold))
                .foregroundStyle(Tokens.progressBlue)
            Text(track.title)
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            Text("\(completed)/\(total) 완료")
                .font(.mCaption.monospacedDigit())
                .foregroundStyle(Tokens.text3)
        }
    }

    private func unitSection(course: CourseV2, unit: UnitV2, index: Int) -> some View {
        let completed = unit.concepts.filter { store.progressV2.percent(for: $0) >= 100 }.count
        let currentConceptID = nextConcept(in: course)?.id
        return VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                Text("단원 \(index + 1)")
                    .font(.mMicro.weight(.bold))
                    .foregroundStyle(Tokens.progressBlue)
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                            Text(unit.title)
                                .font(.mHeading)
                                .foregroundStyle(Tokens.ink)
                                .multilineTextAlignment(.leading)
                                .lineLimit(nil)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("\(completed)/\(unit.concepts.count) 완료")
                                .font(.mCaption.monospacedDigit())
                                .foregroundStyle(Tokens.text3)
                        }
                    } else {
                        HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s3) {
                            Text(unit.title)
                                .font(.mHeading)
                                .foregroundStyle(Tokens.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: Tokens.Space.s3)
                            Text("\(completed)/\(unit.concepts.count)")
                                .font(.mCaption.monospacedDigit())
                                .foregroundStyle(Tokens.text3)
                        }
                    }
                }
            }
            .padding(Tokens.Space.s5)

            Divider()

            ForEach(Array(unit.concepts.enumerated()), id: \.element.id) { conceptIndex, concept in
                conceptRow(
                    concept: concept,
                    index: conceptIndex,
                    currentConceptID: currentConceptID
                )
                if conceptIndex < unit.concepts.count - 1 {
                    Divider().padding(.leading, dynamicTypeSize.isAccessibilitySize ? Tokens.Space.s5 : 62)
                }
            }
        }
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Tokens.line))
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
    }

    private func conceptRow(concept: ConceptV2,
                            index: Int,
                            currentConceptID: String?) -> some View {
        let state = conceptDisplayState(for: concept, currentConceptID: currentConceptID)
        return Button {
            store.openConceptV2(concept.id)
        } label: {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                        conceptCopy(concept, state: state)
                        Label("잠금 없음", systemImage: "lock.open.fill")
                            .font(.mCaption)
                            .foregroundStyle(Tokens.text2)
                    }
                } else {
                    HStack(alignment: .top, spacing: Tokens.Space.s4) {
                        conceptStateGlyph(state, ordinal: index + 1, size: 36)
                        conceptCopy(concept, state: state)
                        Spacer(minLength: Tokens.Space.s2)
                        Image(systemName: "chevron.right")
                            .font(.mCaption.weight(.semibold))
                            .foregroundStyle(Tokens.text3)
                            .padding(.top, 8)
                            .accessibilityHidden(true)
                    }
                }
            }
            .padding(.horizontal, dynamicTypeSize.isAccessibilitySize ? Tokens.Space.s4 : Tokens.Space.s5)
            .padding(.vertical, Tokens.Space.s4)
            .frame(maxWidth: .infinity, minHeight: 72, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(concept.title), \(state.label), 예상 \(concept.lesson?.estimatedMinutes ?? 15)분, 학습 가능, 잠금 없음")
        .accessibilityHint("개념 강의 화면을 엽니다")
    }

    private func conceptCopy(_ concept: ConceptV2,
                             state: CurriculumConceptDisplayState) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s1) {
            Text(concept.title)
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .layoutPriority(1)
            if let code = concept.standardCode, !code.isEmpty {
                Text(code)
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text3)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 3) {
                        conceptStateLabel(state)
                        Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                            .foregroundStyle(Tokens.text3)
                            .monospacedDigit()
                    }
                } else {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: Tokens.Space.s2) {
                            Text(state.label).foregroundStyle(state.foreground)
                            Text("·").accessibilityHidden(true)
                            Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                .foregroundStyle(Tokens.text3)
                                .monospacedDigit()
                            Text("·").accessibilityHidden(true)
                            Label("잠금 없음", systemImage: "lock.open.fill")
                                .foregroundStyle(Tokens.text2)
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text(state.label).foregroundStyle(state.foreground)
                            Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분 · 잠금 없음")
                                .foregroundStyle(Tokens.text3)
                                .monospacedDigit()
                        }
                    }
                }
            }
            .font(.mCaption)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func nextConcept(in course: CourseV2) -> ConceptV2? {
        course.allConcepts.first {
            let percent = store.progressV2.percent(for: $0)
            return percent > 0 && percent < 100
        } ?? course.allConcepts.first {
            store.progressV2.percent(for: $0) < 100
        }
    }

    private func categoryTitle(_ id: String) -> String {
        CurriculumV2.data.categories.first { $0.id == id }?.title ?? "선택 과목"
    }

    private func gradeLabel(_ grades: [Int]) -> String {
        guard !grades.isEmpty else { return "학교별 편성" }
        return grades.map {
            switch $0 {
            case 10: return "고1"
            case 11: return "고2"
            case 12: return "고3"
            default: return "학교별 편성"
            }
        }.joined(separator: "·")
    }

    private func estimatedTimeLabel(_ minutes: Int) -> String {
        guard minutes >= 60 else { return "예상 \(minutes)분" }
        let hours = minutes / 60
        let remainder = minutes % 60
        return remainder == 0
            ? "예상 \(hours)시간"
            : "예상 \(hours)시간 \(remainder)분"
    }

}
