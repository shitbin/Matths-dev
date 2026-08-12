//  CurriculumV2MapScreen.swift
//  Matths
//
//  2022 개정 교육과정 13과목·220개념의 실제 진입 화면.
//  구 5과목 curriculum.json은 평가 호환용으로만 남기고, 학생이 보는 지도와
//  진도는 웹과 같은 curriculum-v2.json / ProgressV2Store를 사용한다.

import SwiftUI

struct CurriculumV2MapScreen: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

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
                Group {
                    if split {
                        HStack(spacing: 0) {
                            courseSidebar
                                .frame(width: 248)
                            Divider()
                            courseScroll(compact: false)
                        }
                    } else {
                        courseScroll(compact: true)
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

    private func courseScroll(compact: Bool) -> some View {
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
            .padding(.horizontal, compact ? Tokens.Space.s4 : Tokens.Space.s8)
            .padding(.vertical, Tokens.Space.s8)
            .padding(.bottom, 88)
        }
        .scrollDismissesKeyboard(.interactively)
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
            HStack(spacing: Tokens.Space.s3) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(categoryTitle(selectedCourse.category))
                        .font(.mMicro.weight(.bold))
                        .foregroundStyle(Tokens.text3)
                    Text(selectedCourse.title)
                        .font(.mBodyB)
                        .foregroundStyle(Tokens.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: Tokens.Space.s3)
                Image(systemName: "chevron.up.chevron.down")
                    .foregroundStyle(Tokens.actionPrimary)
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s3)
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md).stroke(Tokens.line))
        }
        .accessibilityLabel("과목 선택, 현재 \(selectedCourse.title)")
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
                Label("모든 개념은 바로 학습할 수 있습니다", systemImage: "lock.open.fill")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.ink)
                Text("개념 학습에는 잠금이 없고, 평가 응시 조건만 별도로 적용됩니다.")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
                if !prerequisiteTitles.isEmpty {
                    Text("권장 선수 과목 · \(prerequisiteTitles.joined(separator: " · "))")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.actionPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(Tokens.Space.s5)
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Tokens.line))
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
                            Label(percent > 0 ? "이어서 학습" : "다음 개념", systemImage: "arrow.right.circle.fill")
                                .foregroundStyle(Tokens.actionPrimary)
                            Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                .foregroundStyle(Tokens.text3)
                                .monospacedDigit()
                        }
                        .font(.mCaption.weight(.bold))
                    } else {
                        HStack {
                            Label(percent > 0 ? "이어서 학습" : "다음 개념", systemImage: "arrow.right.circle.fill")
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
        .accessibilityLabel("\(percent > 0 ? "이어서 학습" : "다음 개념"), \(concept.title), 진도 \(percent)퍼센트")
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
                        let percent = store.progressV2.percent(for: concept)
                        HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s3) {
                            Text("\(index + 1)")
                                .font(.mCaption.monospacedDigit().weight(.bold))
                                .foregroundStyle(percent >= 100 ? Tokens.success : Tokens.progressBlue)
                                .frame(minWidth: 20, alignment: .leading)
                            Text(concept.title)
                                .font(.mBody)
                                .foregroundStyle(Tokens.ink)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: Tokens.Space.s2)
                            if percent >= 100 {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(Tokens.success)
                                    .accessibilityHidden(true)
                            }
                        }
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
        .accessibilityLabel("추천 학습 코스, \(track.title), \(completed)개 완료, 전체 \(concepts.count)개, \(estimatedTimeLabel(totalMinutes))")
        .accessibilityHint(completed >= concepts.count ? "첫 개념부터 다시 엽니다" : "다음 학습할 개념을 엽니다")
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
                conceptRow(course: course, concept: concept, index: conceptIndex)
                if conceptIndex < unit.concepts.count - 1 {
                    Divider().padding(.leading, 62)
                }
            }
        }
        .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.lg).stroke(Tokens.line))
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
    }

    private func conceptRow(course: CourseV2, concept: ConceptV2, index: Int) -> some View {
        let percent = store.progressV2.percent(for: concept)
        return Button {
            store.openConceptV2(concept.id)
        } label: {
            HStack(alignment: .top, spacing: Tokens.Space.s4) {
                ZStack {
                    Circle().fill(percent >= 100 ? Tokens.successSoft : Tokens.paper2)
                    if percent >= 100 {
                        Image(systemName: "checkmark")
                            .font(.mCaption.weight(.bold))
                            .foregroundStyle(Tokens.success)
                    } else {
                        Text("\(index + 1)")
                            .font(.mCaption.monospacedDigit().weight(.bold))
                            .foregroundStyle(Tokens.text2)
                    }
                }
                .frame(width: 34, height: 34)
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(concept.title)
                        .font(.mBodyB)
                        .foregroundStyle(Tokens.ink)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    if let code = concept.standardCode, !code.isEmpty {
                        Text(code)
                            .font(.mMicro)
                            .foregroundStyle(Tokens.text3)
                    }
                    Group {
                        if dynamicTypeSize.isAccessibilitySize {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(statusLabel(percent))
                                    .foregroundStyle(percent > 0 ? Tokens.actionPrimary : Tokens.text3)
                                Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                    .foregroundStyle(Tokens.text3)
                                    .monospacedDigit()
                            }
                        } else {
                            HStack(spacing: Tokens.Space.s2) {
                                Text(statusLabel(percent))
                                    .foregroundStyle(percent > 0 ? Tokens.actionPrimary : Tokens.text3)
                                Text("·")
                                    .accessibilityHidden(true)
                                Text("예상 \(concept.lesson?.estimatedMinutes ?? 15)분")
                                    .foregroundStyle(Tokens.text3)
                                    .monospacedDigit()
                            }
                        }
                    }
                    .font(.mCaption)
                    .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: Tokens.Space.s3)
                Image(systemName: "chevron.right")
                    .font(.mCaption.weight(.semibold))
                    .foregroundStyle(Tokens.text3)
                    .padding(.top, 8)
            }
            .padding(.horizontal, Tokens.Space.s5)
            .padding(.vertical, Tokens.Space.s4)
            .frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(concept.title), \(statusLabel(percent)), 예상 \(concept.lesson?.estimatedMinutes ?? 15)분, 바로 학습 가능")
        .accessibilityHint("개념 강의 화면을 엽니다")
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

    private func statusLabel(_ percent: Int) -> String {
        if percent >= 100 { return "학습 완료" }
        if percent > 0 { return "진행 중 · \(percent)%" }
        return "시작 전"
    }
}
