//
//  GoatArenaMatchPlayScreen.swift
//  Matths
//
//  GOAT Arena의 개인 경기 화면.
//  경기·역할·문항·제한 시간은 서버 정본만 사용하며, 정답·점수·승패를
//  클라이언트에서 계산하거나 미리 표시하지 않는다.
//

import SwiftUI

struct GoatArenaMatchPlayScreen: View {
    private typealias Attempt = ServerAPI.GoatArenaAttempt
    private typealias QuestionPack = ServerAPI.GoatArenaQuestionPack
    private typealias Question = ServerAPI.GoatArenaQuestionPack.Question
    private typealias Submission = ServerAPI.GoatArenaSubmission

    let matchId: String

    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private let accountSlot: String
    private let clientBuildVersion: String
    @State private var eventChannel: GoatArenaEventChannel
    @State private var startCommandId: String
    @State private var submissionId: String

    @State private var attempt: Attempt?
    @State private var questionPack: QuestionPack?
    @State private var submission: Submission?
    @State private var evidenceReceipt: ServerAPI.GoatArenaEvidenceReceipt?
    @State private var attemptEndsAt: Date?

    @State private var answers: [Int: String] = [:]
    @State private var dirtySlots: Set<Int> = []
    @State private var answerCommandIds: [Int: String] = [:]
    @State private var advanceCommandIds: [Int: String] = [:]
    @State private var currentIndex = 0
    @State private var localReviewContext: GoatArenaLocalReviewContext?

    @State private var isLoading = true
    @State private var didRequestStart = false
    @State private var isSavingAnswer = false
    @State private var isMovingQuestion = false
    @State private var isSubmitting = false
    @State private var didTriggerDeadlineSubmit = false

    @State private var now = Date()
    @State private var startError: String?
    @State private var actionError: String?
    @State private var connectionInterrupted = false
    @State private var connectionNotice: String?

    @State private var confirmSubmit = false
    @State private var confirmExit = false

    private let countdown = Timer.publish(
        every: 1,
        on: .main,
        in: .common
    ).autoconnect()

    init(matchId: String) {
        self.matchId = matchId
        let commandKeys = GoatArenaCommandKeyStore.loadOrCreate(matchId: matchId)
        accountSlot = DataScope.slot
        clientBuildVersion = commandKeys.clientBuildVersion
        _eventChannel = State(
            initialValue: GoatArenaEventChannel(
                matchId: matchId,
                clientBuildVersion: commandKeys.clientBuildVersion,
                accountSlot: DataScope.slot
            )
        )
        _startCommandId = State(initialValue: commandKeys.startCommandId)
        _submissionId = State(initialValue: commandKeys.submissionId)
    }

    private var questions: [Question] {
        (questionPack?.questions ?? []).sorted { left, right in
            left.slot < right.slot
        }
    }

    private var currentQuestion: Question? {
        questions.first
    }

    private var currentQuestionNumber: Int {
        questionPack?.currentQuestionNumber
            ?? attempt?.currentQuestionNumber
            ?? currentQuestion?.slot
            ?? 1
    }

    private var totalQuestionCount: Int {
        max(1, attempt?.questionCount ?? questionPack?.questionCount ?? 5)
    }

    private var answeredCount: Int {
        let currentAnswered = currentQuestion.map {
            !(answers[$0.slot] ?? "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .isEmpty
        } ?? false
        return max(0, currentQuestionNumber - 1) + (currentAnswered ? 1 : 0)
    }

    private var remainingSeconds: Int? {
        guard let attemptEndsAt else { return nil }
        return max(0, Int(ceil(attemptEndsAt.timeIntervalSince(now))))
    }

    private var interactionBusy: Bool {
        isSavingAnswer || isMovingQuestion || isSubmitting
    }

    private var deadlineReached: Bool {
        remainingSeconds == 0
    }

    private var answerInteractionDisabled: Bool {
        interactionBusy || deadlineReached
    }

    private var attemptIsSubmitted: Bool {
        submission != nil || (attempt.map {
            ["EVIDENCE_REQUIRED", "SUBMITTED"].contains($0.status)
        } ?? false)
    }

    /// 서버가 증거 제출을 요구한 동안에는 실수로 경기 화면을 닫지 않는다.
    /// 마감이 지난 뒤에는 사용자를 화면에 가두지 않고 Arena로 돌아갈 수 있게 한다.
    private var evidenceSubmissionOutstanding: Bool {
        guard evidenceReceipt == nil else { return false }
        let required = submission?.evidenceRequired ?? attempt?.evidenceRequired ?? false
        guard required else { return false }
        let rawDeadline = submission?.evidenceDeadlineAt ?? attempt?.evidenceDeadlineAt
        guard let rawDeadline, let deadline = ArenaServerDate.parse(rawDeadline) else {
            return true
        }
        return deadline > now
    }

    private var accountIsCurrent: Bool {
        DataScope.slot == accountSlot
    }

    private var usesDebugFixture: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-goatMatchFixture")
        #else
        false
        #endif
    }

    var body: some View {
        ZStack {
            Tokens.paper
                .ignoresSafeArea()

            VStack(spacing: 0) {
                header

                Group {
                    if isLoading {
                        loadingView
                    } else if let startError {
                        failedView(startError)
                    } else if let submission {
                        submittedView(submission)
                    } else if let attempt,
                              ["EVIDENCE_REQUIRED", "SUBMITTED"].contains(attempt.status) {
                        submittedAttemptView(attempt)
                    } else if attempt != nil, questionPack != nil {
                        playView
                    } else {
                        failedView("경기 정보를 확인할 수 없습니다. GOAT Arena 화면에서 다시 시도해 주세요.")
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            await beginMatchIfNeeded()
        }
        .task(id: attempt?.attemptId) {
            if !usesDebugFixture { await heartbeatLoop() }
        }
        .onReceive(countdown) { date in
            now = date
            guard attempt != nil,
                  !attemptIsSubmitted,
                  remainingSeconds == 0,
                  !didTriggerDeadlineSubmit else { return }
            didTriggerDeadlineSubmit = true
            Task { await refreshAfterQuestionDeadline() }
        }
        .onChange(of: scenePhase) { _, phase in
            handleScenePhase(phase)
        }
        .onReceive(NotificationCenter.default.publisher(for: DataScope.didSwitchNotification)) { note in
            guard let newSlot = note.object as? String,
                  newSlot != accountSlot else { return }
            dismiss()
        }
        .confirmationDialog(
            "답안을 제출할까요?",
            isPresented: $confirmSubmit,
            titleVisibility: .visible
        ) {
            Button("최종 제출") {
                Task { await advanceCurrentQuestion() }
            }
            Button("계속 풀기", role: .cancel) {}
        } message: {
            let unanswered = max(0, totalQuestionCount - answeredCount)
            Text(
                unanswered == 0
                    ? "제출 뒤에는 답안을 바꿀 수 없습니다."
                    : "아직 답하지 않은 문항이 \(unanswered)개 있습니다. 제출 뒤에는 답안을 바꿀 수 없습니다."
            )
        }
        .confirmationDialog(
            "경기 화면을 나갈까요?",
            isPresented: $confirmExit,
            titleVisibility: .visible
        ) {
            Button("현재 답안 저장 후 나가기") {
                Task { await saveAndDismiss() }
            }
            Button("나중에 이어하기", role: .destructive) {
                persistDraft()
                dismiss()
            }
            Button("계속 풀기", role: .cancel) {}
        } message: {
            Text("화면을 나가도 개인 제한 시간은 계속 흐릅니다. 저장되지 않은 답안은 이 iPad에 임시 보관됩니다.")
        }
        .alert(
            "요청을 완료하지 못했습니다",
            isPresented: Binding(
                get: { actionError != nil },
                set: { if !$0 { actionError = nil } }
            )
        ) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(actionError ?? "")
        }
        .interactiveDismissDisabled(!attemptIsSubmitted || evidenceSubmissionOutstanding)
    }

    // MARK: Header

    private var header: some View {
        VStack(spacing: 0) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s4) {
                    headerCloseButton
                    headerTitle
                    Spacer(minLength: Tokens.Space.s3)
                    headerAttemptStatus
                }

                VStack(spacing: Tokens.Space.s2) {
                    HStack(spacing: Tokens.Space.s3) {
                        headerCloseButton
                        headerTitle
                        Spacer(minLength: 0)
                    }
                    if attempt != nil, !attemptIsSubmitted {
                        HStack {
                            Spacer(minLength: 44 + Tokens.Space.s3)
                            headerAttemptStatus
                        }
                    }
                }
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s2)

            if let attempt, let remainingSeconds, !attemptIsSubmitted {
                ProgressBar(
                    value: min(
                        1,
                        max(
                            0,
                            Double(remainingSeconds)
                                / Double(max(1, attempt.timeLimitSeconds))
                        )
                    ),
                    tint: remainingSeconds <= 60 ? Tokens.danger : Tokens.primary,
                    track: Tokens.paper2
                )
                .frame(height: 4)
                .accessibilityLabel("개인 경기 남은 시간")
                .accessibilityValue(timeText(remainingSeconds))
            }
        }
        .background(Tokens.surface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Tokens.line)
                .frame(height: 1)
        }
    }

    private var headerCloseButton: some View {
        Button {
            if evidenceSubmissionOutstanding {
                actionError = "풀이 증거 제출 시간이 진행 중입니다. 사진을 제출한 뒤 경기 화면을 닫아 주세요."
            } else if attemptIsSubmitted || attempt == nil {
                dismiss()
            } else {
                confirmExit = true
            }
        } label: {
            Image(systemName: "xmark")
                .font(.mBodyB)
                .foregroundStyle(Tokens.text2)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("경기 화면 닫기")
    }

    private var headerTitle: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("GOAT ARENA")
                .font(.mMicro)
                .foregroundStyle(Tokens.primary)
            Text(attempt.map { roleTitle($0.participantRole) } ?? "경기 준비")
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var headerAttemptStatus: some View {
        if let attempt, !attemptIsSubmitted {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s3) {
                    Text("응답 \(answeredCount) / \(attempt.questionCount)")
                        .font(.mNumeric)
                        .foregroundStyle(Tokens.text2)
                        .monospacedDigit()
                    countdownLabel
                }

                countdownLabel
            }
        }
    }

    @ViewBuilder
    private var countdownLabel: some View {
        if let remainingSeconds {
            HStack(spacing: 6) {
                Circle()
                    .fill(remainingSeconds <= 60 ? Tokens.danger : Tokens.primary)
                    .frame(width: 7, height: 7)
                Text(timeText(remainingSeconds))
                    .font(.mNumeric)
                    .foregroundStyle(remainingSeconds <= 60 ? Tokens.danger : Tokens.ink)
                    .monospacedDigit()
            }
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 36)
            .background(
                remainingSeconds <= 60 ? Tokens.dangerSoft : Tokens.primarySoft,
                in: RoundedRectangle(cornerRadius: Tokens.Radius.md)
            )
            .accessibilityElement(children: .combine)
            .accessibilityLabel("남은 시간 \(timeText(remainingSeconds))")
        }
    }

    // MARK: States

    private var loadingView: some View {
        VStack(spacing: Tokens.Space.s5) {
            ProgressView()
                .controlSize(.large)
                .tint(Tokens.primary)
            Text("개인 경기와 문제를 준비하고 있습니다")
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
            Text("서버가 내 역할과 개인 제한 시간을 확정합니다.")
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
        }
        .padding(Tokens.Space.s6)
    }

    private func failedView(_ message: String) -> some View {
        VStack(spacing: Tokens.Space.s5) {
            Image(systemName: "exclamationmark.shield.fill")
                .font(.system(size: 38, weight: .semibold))
                .foregroundStyle(Tokens.warningInk)
            Text("경기를 열지 못했습니다")
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
            Text(message)
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: Tokens.Space.s3) {
                Button("GOAT Arena로 돌아가기") {
                    dismiss()
                }
                .buttonStyle(SecondaryButtonStyle())

                Button("다시 시도") {
                    Task { await retryStart() }
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 220)
            }
        }
        .padding(Tokens.Space.s6)
        .frame(maxWidth: 620)
    }

    private func submittedView(_ submission: Submission) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Space.s6) {
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 42, weight: .semibold))
                        .foregroundStyle(Tokens.successInk)

                    Text("답안 제출이 완료되었습니다")
                        .font(.mTitle)
                        .foregroundStyle(Tokens.ink)

                    Text(submission.evidenceRequired == true
                         ? "답안은 서버에 고정되었습니다. 이제 서버가 정한 마감 안에 풀이 사진을 제출해 주세요. 사진 제출 뒤 상대 결과와 검토가 끝날 때까지 점수나 승패를 미리 표시하지 않습니다."
                         : "서버가 두 참가자의 답안을 같은 기준으로 채점하고 있습니다. 상대 결과와 무결성 판정이 끝나기 전에는 점수나 승패를 미리 표시하지 않습니다.")
                        .font(.mCallout)
                        .foregroundStyle(Tokens.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }

                DottedRule()

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: Tokens.Space.s8) {
                        submissionFacts(submission)
                    }

                    VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                        submissionFacts(submission)
                    }
                }

                if submission.evidenceRequired == true {
                    evidencePanel(
                        attemptId: submission.attemptId,
                        deadlineAt: submission.evidenceDeadlineAt)
                }

                Button("GOAT Arena에서 상태 확인") {
                    dismiss()
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 320)
                .disabled(evidenceSubmissionOutstanding)
            }
            .padding(Tokens.Space.s6)
            .frame(maxWidth: Tokens.readableWidth, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private func submissionFacts(_ submission: Submission) -> some View {
        submittedFact("제출 답안", "\(submission.answerCount)개")
        submittedFact("마지막 기록", "#\(submission.lastAcceptedServerSequence)")
        if let submittedAt = ArenaServerDate.parse(submission.submittedAt) {
            submittedFact(
                "서버 접수",
                submittedAt.formatted(
                    Date.FormatStyle(date: .omitted, time: .shortened)
                        .locale(Locale(identifier: "ko_KR"))
                )
            )
        }
    }

    /// 시작 응답을 잃었거나 앱을 다시 연 뒤 서버가 이미 SUBMITTED 상태를 돌려준
    /// 경우의 복구 화면. 상세 제출 원장이 없어도 다시 문제를 열거나 start를 반복하지
    /// 않고 서버가 확인한 상태만 표시한다.
    private func submittedAttemptView(_ attempt: Attempt) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Space.s6) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 42, weight: .semibold))
                    .foregroundStyle(Tokens.successInk)

                Text("답안 제출이 완료되었습니다")
                    .font(.mTitle)
                    .foregroundStyle(Tokens.ink)

                Text(attempt.evidenceRequired == true
                     ? "답안은 서버에 고정되어 있습니다. 서버가 정한 마감 안에 풀이 사진을 제출해 주세요."
                     : "서버에 제출된 개인 경기입니다. 상대 제출과 채점·무결성 판정이 끝날 때까지 점수나 승패를 미리 표시하지 않습니다.")
                    .font(.mCallout)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)

                if let submittedAt = attempt.submittedAt.flatMap(ArenaServerDate.parse) {
                    DottedRule()
                    submittedFact(
                        "서버 접수",
                        submittedAt.formatted(
                            Date.FormatStyle(date: .omitted, time: .shortened)
                                .locale(Locale(identifier: "ko_KR"))
                        )
                    )
                }


                if attempt.evidenceRequired == true {
                    evidencePanel(
                        attemptId: attempt.attemptId,
                        deadlineAt: attempt.evidenceDeadlineAt)
                }

                Button("GOAT Arena에서 상태 확인") {
                    dismiss()
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 320)
                .disabled(evidenceSubmissionOutstanding)
            }
            .padding(Tokens.Space.s6)
            .frame(maxWidth: Tokens.readableWidth, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    private func submittedFact(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.mMicro)
                .foregroundStyle(Tokens.text3)
            Text(value)
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
                .monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    private func evidencePanel(
        attemptId: String,
        deadlineAt: String?
    ) -> some View {
        GoatArenaEvidencePanel(
            matchId: matchId,
            attemptId: attemptId,
            deadlineAt: deadlineAt.flatMap(ArenaServerDate.parse),
            clientBuildVersion: clientBuildVersion,
            accountSlot: accountSlot,
            reviewContext: localReviewContext?.cheatingProblemContext
                ?? GoatArenaLocalReviewContextStore.load(
                    matchId: matchId,
                    attemptId: attemptId
                )?.cheatingProblemContext
                ?? GoatArenaLocalReviewContext.visualOnlyProblemContext()
        ) { receipt in
            evidenceReceipt = receipt
            localReviewContext = nil
        }
    }

    // MARK: Play

    private var playView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Space.s5) {
                if let connectionNotice {
                    connectionBanner(connectionNotice)
                }

                currentQuestionProgress
                questionPanel

                Text("시간과 답안 접수 시각은 서버가 판정합니다. 제출 뒤 정답·점수·승패는 정산이 끝난 GOAT Arena 화면에서 확인할 수 있습니다.")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(horizontalSizeClass == .compact ? Tokens.Space.s4 : Tokens.Space.s6)
            .frame(maxWidth: Tokens.readableWidth, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    private var currentQuestionProgress: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            HStack {
                Text("현재 문항")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text2)
                Spacer()
                Text("\(currentQuestionNumber) / \(totalQuestionCount)")
                    .font(.mNumeric)
                    .foregroundStyle(Tokens.ink)
                    .monospacedDigit()
            }
            ProgressBar(
                value: Double(currentQuestionNumber) / Double(totalQuestionCount),
                tint: Tokens.primary,
                track: Tokens.paper2
            )
            Text("다음 문항으로 넘어가면 이전 문제와 답은 다시 열 수 없습니다.")
                .font(.mCaption)
                .foregroundStyle(Tokens.text3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Tokens.Space.s4)
        .background(Tokens.surface)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .strokeBorder(Tokens.line, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
    }

    private func connectionBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: Tokens.Space.s3) {
            Image(systemName: "wifi.exclamationmark")
                .foregroundStyle(Tokens.warningInk)
                .frame(width: 24, height: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text("연결을 다시 확인하고 있습니다")
                    .font(.mBodyB)
                    .foregroundStyle(Tokens.ink)
                Text(message)
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(Tokens.Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Tokens.warningSoft)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
    }

    @ViewBuilder
    private var questionPanel: some View {
        if let question = currentQuestion {
            VStack(alignment: .leading, spacing: Tokens.Space.s6) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s3) {
                    Text("문항 \(currentQuestionNumber)")
                        .font(.mMicro)
                        .foregroundStyle(Tokens.primary)
                    Text("/ \(totalQuestionCount)")
                        .font(.mMicro)
                        .foregroundStyle(Tokens.text3)
                    Spacer()
                    answerSaveStatus(question)
                }

                ExamRule()

                MathInline(
                    text: MathText.normalizeDelimiters(question.stem),
                    font: .mHeading,
                    color: Tokens.ink,
                    pixelSize: 22
                )
                .frame(maxWidth: .infinity, alignment: .leading)

                if let visualizationJSON = question.visualizationJSON,
                   !visualizationJSON.isEmpty {
                    ArenaProblemVisualizationView(
                        visualizationJSON: visualizationJSON
                    )
                    .frame(
                        height: horizontalSizeClass == .compact ? 240 : 320
                    )
                    .clipShape(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    )
                    .accessibilityLabel("문제의 그래프 또는 도형")
                }

                if let choices = question.choices, !choices.isEmpty {
                    VStack(spacing: Tokens.Space.s3) {
                        ForEach(choices) { choice in
                            choiceButton(choice, question: question)
                        }
                    }
                } else {
                    shortAnswerField(question)
                }

                DottedRule()

                questionControls
            }
            .padding(horizontalSizeClass == .compact ? Tokens.Space.s5 : Tokens.Space.s6)
            .frame(maxWidth: .infinity, minHeight: 470, alignment: .topLeading)
            .background(Tokens.surface)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                    .strokeBorder(Tokens.line, lineWidth: 1)
            )
        }
    }

    private func answerSaveStatus(_ question: Question) -> some View {
        let hasAnswer = !(answers[question.slot] ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .isEmpty
        let isDirty = dirtySlots.contains(question.slot)

        return HStack(spacing: 5) {
            if isSavingAnswer {
                ProgressView()
                    .controlSize(.mini)
            } else {
                Circle()
                    .fill(
                        isDirty ? Tokens.warningInk
                            : (hasAnswer ? Tokens.successInk : Tokens.text4)
                    )
                    .frame(width: 7, height: 7)
            }
            Text(
                isSavingAnswer ? "답안 저장 중"
                    : (isDirty ? "저장 필요"
                        : (hasAnswer ? "서버 저장됨" : "미응답"))
            )
            .font(.mMicro)
            .foregroundStyle(
                isDirty ? Tokens.warningInk
                    : (hasAnswer ? Tokens.successInk : Tokens.text3)
            )
        }
        .accessibilityElement(children: .combine)
    }

    private func choiceButton(
        _ choice: ServerAPI.GoatArenaQuestionPack.Choice,
        question: Question
    ) -> some View {
        let selected = answers[question.slot] == choice.key

        return Button {
            updateAnswer(choice.key, for: question.slot)
            Task { _ = await saveAnswer(slot: question.slot, reportFailure: true) }
        } label: {
            HStack(alignment: .center, spacing: Tokens.Space.s4) {
                Text(choice.key.uppercased())
                    .font(.mBodyB)
                    .foregroundStyle(selected ? Tokens.onPrimary : Tokens.primary)
                    .frame(width: 36, height: 36)
                    .background(
                        selected ? Tokens.primary : Tokens.primarySoft,
                        in: RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                    )

                MathInline(
                    text: MathText.normalizeDelimiters(choice.text),
                    font: .mBody,
                    color: Tokens.ink,
                    pixelSize: 17
                )
                .allowsHitTesting(false)

                Spacer(minLength: 0)

                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? Tokens.primary : Tokens.text4)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, Tokens.Space.s4)
            .padding(.vertical, Tokens.Space.s3)
            .frame(maxWidth: .infinity, minHeight: 58, alignment: .leading)
            .background(
                selected ? Tokens.primarySoft : Tokens.paper,
                in: RoundedRectangle(cornerRadius: Tokens.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .strokeBorder(
                        selected ? Tokens.primary : Tokens.lineStrong,
                        lineWidth: selected ? 2 : 1
                    )
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(answerInteractionDisabled)
        .accessibilityLabel("\(choice.key)번, \(MathText.plain(choice.text))")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func shortAnswerField(_ question: Question) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            Text("답")
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)

            TextField(
                "답을 입력하세요",
                text: answerBinding(for: question.slot),
                axis: .vertical
            )
            .font(.mBody)
            .foregroundStyle(Tokens.ink)
            .lineLimit(2...5)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.numberPad)
            .submitLabel(.done)
            .onSubmit {
                Task { _ = await saveAnswer(slot: question.slot, reportFailure: true) }
            }
            .padding(Tokens.Space.s4)
            .background(
                Tokens.paper,
                in: RoundedRectangle(cornerRadius: Tokens.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .strokeBorder(
                        dirtySlots.contains(question.slot)
                            ? Tokens.warningInk
                            : Tokens.lineStrong,
                        lineWidth: dirtySlots.contains(question.slot) ? 1.5 : 1
                    )
            )
            .disabled(answerInteractionDisabled)

            HStack {
                Text("1부터 999까지의 자연수를 입력하세요.")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text3)
                Spacer()
                Text("\((answers[question.slot] ?? "").count) / 3")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text3)
                    .monospacedDigit()
            }
        }
    }

    private var questionControls: some View {
        primaryQuestionButton
            .frame(maxWidth: .infinity, alignment: .trailing)
    }

    @ViewBuilder
    private var primaryQuestionButton: some View {
        if deadlineReached {
            Button {
                Task { await refreshAfterQuestionDeadline() }
            } label: {
                Label("제출 상태 다시 확인", systemImage: "arrow.clockwise")
            }
            .buttonStyle(PrimaryButtonStyle())
            .frame(maxWidth: 260)
            .disabled(interactionBusy)
        } else if currentQuestionNumber < totalQuestionCount {
            Button {
                Task { await advanceCurrentQuestion() }
            } label: {
                Label("다음 문항", systemImage: "chevron.right")
                    .labelStyle(.titleAndIcon)
            }
            .buttonStyle(PrimaryButtonStyle())
            .frame(maxWidth: 260)
            .disabled(interactionBusy)
        } else {
            Button {
                confirmSubmit = true
            } label: {
                Label("풀이 완료", systemImage: "paperplane.fill")
            }
            .buttonStyle(PrimaryButtonStyle())
            .frame(maxWidth: 260)
            .disabled(interactionBusy)
        }
    }

    // MARK: Start and validation

    @MainActor
    private func beginMatchIfNeeded() async {
        guard !didRequestStart, accountIsCurrent else {
            if !accountIsCurrent { dismiss() }
            return
        }
        didRequestStart = true
        isLoading = true
        startError = nil

        #if DEBUG
        if usesDebugFixture {
            let fixture = GoatArenaMatchFixture.make(matchId: matchId)
            attempt = fixture.attempt
            questionPack = fixture.questionPack
            attemptEndsAt = fixture.endsAt
            now = Date()
            currentIndex = 0
            isLoading = false
            return
        }
        #endif

        do {
            let response = try await ServerAPI.startGoatArenaMatch(
                matchId: matchId,
                commandId: startCommandId,
                clientBuildVersion: clientBuildVersion
            )
            guard accountIsCurrent else {
                dismiss()
                return
            }
            try validate(response)

            let end = try ArenaServerDate.required(
                response.attempt.endsAt,
                label: "개인 제출 마감"
            )

            attempt = response.attempt
            questionPack = response.questionPack
            attemptEndsAt = end
            now = Date()
            currentIndex = 0
            answers = Dictionary(
                uniqueKeysWithValues: response.questionPack.questions.map {
                    ($0.slot, String(($0.savedAnswer ?? "").prefix(3)))
                }
            )
            localReviewContext = GoatArenaLocalReviewContextStore.load(
                matchId: matchId,
                attemptId: response.attempt.attemptId
            )
            captureCurrentQuestionForLocalReview()

            if ["EVIDENCE_REQUIRED", "SUBMITTED"].contains(response.attempt.status) {
                GoatArenaDraftStore.clear(
                    matchId: matchId,
                    attemptId: response.attempt.attemptId
                )
                GoatArenaCommandKeyStore.clear(matchId: matchId)
                isLoading = false
                return
            }

            if let draft = GoatArenaDraftStore.load(
                matchId: matchId,
                attemptId: response.attempt.attemptId,
                questionPackId: response.questionPack.questionPackId
            ) {
                let validSlots = Set(response.questionPack.questions.map(\.slot))
                answers = draft.answers
                    .filter { validSlots.contains($0.key) }
                    .mapValues { String($0.filter(\.isNumber).prefix(3)) }
                dirtySlots = Set(draft.dirtySlots ?? Array(draft.answers.keys))
                    .intersection(validSlots)
                answerCommandIds = (draft.answerCommandIds ?? [:])
                    .filter { dirtySlots.contains($0.key) && !$0.value.isEmpty }
                for slot in dirtySlots where answerCommandIds[slot] == nil {
                    answerCommandIds[slot] = UUID().uuidString
                }
                currentIndex = min(
                    max(0, draft.currentQuestionIndex),
                    max(0, response.questionPack.questions.count - 1)
                )
                captureCurrentQuestionForLocalReview()
                persistDraft()
            }

            isLoading = false

            await sendNetworkState("ONLINE")
            if let question = currentQuestion {
                await sendFocus(question.slot)
            }
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return
            }
            isLoading = false
            startError = playErrorMessage(error, operation: .start)
        }
    }

    @MainActor
    private func retryStart() async {
        guard !isLoading else { return }
        didRequestStart = false
        await beginMatchIfNeeded()
    }

    private func validate(_ response: ServerAPI.GoatArenaStartResponse) throws {
        guard response.attempt.matchId == matchId,
              response.questionPack.matchId == matchId,
              response.attempt.questionPackId == response.questionPack.questionPackId,
              response.attempt.participantRole == response.questionPack.participantRole,
              ["CHALLENGER", "DEFENDER"].contains(response.attempt.participantRole),
              ["IN_PROGRESS", "EVIDENCE_REQUIRED", "SUBMITTED"].contains(response.attempt.status),
              response.attempt.questionCount == response.questionPack.questionCount,
              response.attempt.timeLimitSeconds == response.questionPack.timeLimitSeconds,
              response.attempt.questionPackVersion == response.questionPack.packVersion,
              response.attempt.scoringPolicyVersion == response.questionPack.scoringPolicyVersion
        else {
            throw GoatArenaPlayError.invalidContract
        }

        let currentNumber = response.questionPack.currentQuestionNumber
            ?? response.attempt.currentQuestionNumber
        let isInProgress = response.attempt.status == "IN_PROGRESS"
        guard (1...response.questionPack.questionCount).contains(currentNumber ?? 0),
              isInProgress
                ? (response.questionPack.questions.count == 1
                    && response.questionPack.questions.first?.slot == currentNumber)
                : response.questionPack.questions.isEmpty
        else {
            throw GoatArenaPlayError.invalidContract
        }

        let startedAt = try ArenaServerDate.required(
            response.attempt.startedAt,
            label: "개인 경기 시작"
        )
        let endsAt = try ArenaServerDate.required(
            response.attempt.endsAt,
            label: "개인 제출 마감"
        )
        let commonSubmitsBy = try ArenaServerDate.required(
            response.attempt.commonSubmitsBy,
            label: "공통 제출 마감"
        )
        guard startedAt <= endsAt, endsAt <= commonSubmitsBy else {
            throw GoatArenaPlayError.invalidContract
        }
    }

    // MARK: Answer and navigation

    private func answerBinding(for slot: Int) -> Binding<String> {
        Binding(
            get: { answers[slot] ?? "" },
            set: { updateAnswer(String($0.filter(\.isNumber).prefix(3)), for: slot) }
        )
    }

    private func updateAnswer(_ value: String, for slot: Int) {
        guard answers[slot] != value else { return }
        answers[slot] = value
        dirtySlots.insert(slot)
        answerCommandIds[slot] = UUID().uuidString
        captureCurrentQuestionForLocalReview()
        persistDraft()
    }

    @MainActor
    @discardableResult
    private func saveAnswer(slot: Int, reportFailure: Bool) async -> Bool {
        guard accountIsCurrent, attempt?.status == "IN_PROGRESS",
              submission == nil else { return false }
        while isSavingAnswer {
            do {
                try await Task.sleep(for: .milliseconds(40))
            } catch {
                return false
            }
        }

        guard dirtySlots.contains(slot) else { return true }
        let value = answers[slot] ?? ""
        let commandId = answerCommandIds[slot] ?? UUID().uuidString
        answerCommandIds[slot] = commandId
        isSavingAnswer = true
        defer { isSavingAnswer = false }

        do {
            _ = try await eventChannel.saveAnswer(
                slot: slot,
                answer: value,
                commandId: commandId
            )
            guard accountIsCurrent else {
                dismiss()
                return false
            }
            if answers[slot] == value, answerCommandIds[slot] == commandId {
                dirtySlots.remove(slot)
                answerCommandIds.removeValue(forKey: slot)
            }
            markConnectionRestoredIfNeeded()
            persistDraft()
            return true
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return false
            }
            noteConnectionFailure()
            if reportFailure {
                actionError = playErrorMessage(error, operation: .answer)
            }
            return false
        }
    }

    @MainActor
    private func installServerState(
        _ response: ServerAPI.GoatArenaStartResponse
    ) throws {
        captureCurrentQuestionForLocalReview()
        try validate(response)
        let end = try ArenaServerDate.required(
            response.attempt.endsAt,
            label: "현재 문항 마감"
        )
        attempt = response.attempt
        questionPack = response.questionPack
        attemptEndsAt = end
        now = Date()
        currentIndex = 0
        didTriggerDeadlineSubmit = false
        dirtySlots.removeAll()
        answerCommandIds.removeAll()
        answers = Dictionary(
            uniqueKeysWithValues: response.questionPack.questions.map {
                ($0.slot, String(($0.savedAnswer ?? "").filter(\.isNumber).prefix(3)))
            }
        )
        localReviewContext = GoatArenaLocalReviewContextStore.load(
            matchId: matchId,
            attemptId: response.attempt.attemptId
        ) ?? localReviewContext
        captureCurrentQuestionForLocalReview()

        if ["EVIDENCE_REQUIRED", "SUBMITTED"].contains(response.attempt.status) {
            GoatArenaDraftStore.clear(
                matchId: matchId,
                attemptId: response.attempt.attemptId
            )
            GoatArenaCommandKeyStore.clear(matchId: matchId)
        } else {
            persistDraft()
        }
    }

    /// 서버가 현재 문항의 답을 확정한 뒤에만 다음 문항을 공개한다.
    /// 이전 문항은 응답에서 제거되므로 앱에서도 다시 이동할 경로를 만들지 않는다.
    @MainActor
    private func advanceCurrentQuestion() async {
        guard accountIsCurrent,
              attempt?.status == "IN_PROGRESS",
              let question = currentQuestion,
              !isMovingQuestion else { return }
        let answer = (answers[question.slot] ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let commandId = advanceCommandIds[question.slot] ?? UUID().uuidString
        advanceCommandIds[question.slot] = commandId
        isMovingQuestion = true
        defer { isMovingQuestion = false }

        do {
            let response = try await ServerAPI.advanceGoatArenaQuestion(
                matchId: matchId,
                questionSlot: question.slot,
                answer: answer,
                commandId: commandId,
                clientBuildVersion: clientBuildVersion
            )
            guard accountIsCurrent else {
                dismiss()
                return
            }
            try installServerState(response)
            advanceCommandIds.removeValue(forKey: question.slot)
            markConnectionRestoredIfNeeded()
            if let next = currentQuestion {
                await sendFocus(next.slot)
            }
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return
            }
            noteConnectionFailure()
            actionError = playErrorMessage(error, operation: .submit)
        }
    }

    /// 문항 제한 시간이 끝나면 같은 start/read adapter를 다시 호출한다.
    /// 서버 시각으로 timeout advance를 수행하므로 클라이언트가 답이나 문항 번호를
    /// 임의 확정하지 않는다.
    @MainActor
    private func refreshAfterQuestionDeadline() async {
        guard accountIsCurrent, !isMovingQuestion else { return }
        isMovingQuestion = true
        defer { isMovingQuestion = false }
        do {
            let response = try await ServerAPI.startGoatArenaMatch(
                matchId: matchId,
                commandId: startCommandId,
                clientBuildVersion: clientBuildVersion
            )
            guard accountIsCurrent else {
                dismiss()
                return
            }
            try installServerState(response)
            markConnectionRestoredIfNeeded()
            if let next = currentQuestion {
                await sendFocus(next.slot)
            }
        } catch {
            didTriggerDeadlineSubmit = false
            guard accountIsCurrent else {
                dismiss()
                return
            }
            noteConnectionFailure()
            actionError = playErrorMessage(error, operation: .submit)
        }
    }

    // MARK: Events

    private func heartbeatLoop() async {
        guard accountIsCurrent, attempt?.status == "IN_PROGRESS",
              submission == nil else { return }

        while !Task.isCancelled {
            do {
                try await Task.sleep(for: .seconds(5))
            } catch {
                return
            }
            guard accountIsCurrent else { return }
            guard !Task.isCancelled,
                  scenePhase == .active,
                  attempt?.status == "IN_PROGRESS",
                  submission == nil else { continue }
            await sendHeartbeat()
        }
    }

    @MainActor
    private func sendHeartbeat() async {
        guard accountIsCurrent, attempt?.status == "IN_PROGRESS",
              submission == nil else { return }
        do {
            _ = try await eventChannel.heartbeat()
            guard accountIsCurrent else {
                dismiss()
                return
            }
            if connectionInterrupted {
                connectionInterrupted = false
                _ = try? await eventChannel.networkState("RECONNECTED")
            }
            connectionNotice = nil
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return
            }
            noteConnectionFailure()
        }
    }

    @MainActor
    private func sendFocus(_ slot: Int) async {
        guard accountIsCurrent, attempt?.status == "IN_PROGRESS",
              submission == nil else { return }
        do {
            _ = try await eventChannel.focus(slot: slot)
            guard accountIsCurrent else {
                dismiss()
                return
            }
            markConnectionRestoredIfNeeded()
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return
            }
            noteConnectionFailure()
        }
    }

    @MainActor
    private func sendNetworkState(_ state: String) async {
        guard accountIsCurrent, attempt?.status == "IN_PROGRESS",
              submission == nil else { return }
        do {
            _ = try await eventChannel.networkState(state)
            guard accountIsCurrent else {
                dismiss()
                return
            }
            if state == "FOREGROUND" || state == "ONLINE" || state == "RECONNECTED" {
                markConnectionRestoredIfNeeded()
            }
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return
            }
            noteConnectionFailure()
        }
    }

    private func handleScenePhase(_ phase: ScenePhase) {
        if usesDebugFixture { return }
        guard accountIsCurrent, attempt?.status == "IN_PROGRESS",
              submission == nil else { return }

        switch phase {
        case .active:
            Task {
                await sendNetworkState(connectionInterrupted ? "RECONNECTED" : "FOREGROUND")
                await sendHeartbeat()
            }
        case .background:
            persistDraft()
            Task {
                if let currentQuestion {
                    _ = await saveAnswer(
                        slot: currentQuestion.slot,
                        reportFailure: false
                    )
                }
                await sendNetworkState("BACKGROUND")
            }
        case .inactive:
            // background task가 실행되기 전에 앱이 정지될 수 있으므로 로컬 초안은
            // 동기적으로 먼저 확정한다.
            persistDraft()
        @unknown default:
            break
        }
    }

    private func noteConnectionFailure() {
        connectionInterrupted = true
        connectionNotice = "답안은 이 iPad에 임시 보관됩니다. 연결이 돌아오면 같은 경기로 다시 전송합니다."
    }

    private func markConnectionRestoredIfNeeded() {
        guard connectionInterrupted else { return }
        connectionInterrupted = false
        connectionNotice = nil
    }

    // MARK: Submit and exit

    @MainActor
    private func submitAttempt(automatic: Bool) async {
        guard accountIsCurrent,
              attempt?.status == "IN_PROGRESS",
              submission == nil,
              !isSubmitting else { return }
        isSubmitting = true
        defer { isSubmitting = false }
        captureCurrentQuestionForLocalReview()

        var allAnswersSaved = true
        for slot in dirtySlots.sorted() {
            let saved = await saveAnswer(slot: slot, reportFailure: !automatic)
            if !saved {
                allAnswersSaved = false
                if !automatic { return }
            }
        }

        do {
            let result = try await eventChannel.submit(commandId: submissionId)
            guard accountIsCurrent else {
                dismiss()
                return
            }
            guard result.matchId == matchId,
                  result.attemptId == attempt?.attemptId else {
                throw GoatArenaPlayError.invalidContract
            }
            submission = result
            GoatArenaDraftStore.clear(
                matchId: matchId,
                attemptId: result.attemptId
            )
            GoatArenaCommandKeyStore.clear(matchId: matchId)
            connectionNotice = nil
        } catch {
            guard accountIsCurrent else {
                dismiss()
                return
            }
            noteConnectionFailure()
            actionError = automatic
                ? "개인 마감 시각이 지났지만 서버 제출 확인이 아직 끝나지 않았습니다. 연결을 확인한 뒤 답안 제출을 다시 눌러 주세요."
                : playErrorMessage(error, operation: .submit)
            if automatic, !allAnswersSaved {
                connectionNotice = "일부 답안과 최종 제출을 서버에 확인하지 못했습니다. 로컬 임시 답안은 보존되어 있습니다."
            }
        }
    }

    @MainActor
    private func saveAndDismiss() async {
        if let currentQuestion {
            let saved = await saveAnswer(
                slot: currentQuestion.slot,
                reportFailure: true
            )
            guard saved else { return }
        }
        await sendNetworkState("BACKGROUND")
        persistDraft()
        dismiss()
    }

    private func persistDraft() {
        guard accountIsCurrent, let attempt, let questionPack,
              attempt.status == "IN_PROGRESS", submission == nil else { return }
        GoatArenaDraftStore.save(
            .init(
                matchId: matchId,
                attemptId: attempt.attemptId,
                questionPackId: questionPack.questionPackId,
                currentQuestionIndex: currentIndex,
                answers: answers,
                dirtySlots: dirtySlots.sorted(),
                answerCommandIds: answerCommandIds.filter {
                    dirtySlots.contains($0.key)
                }
            )
        )
    }

    private func captureCurrentQuestionForLocalReview() {
        guard accountIsCurrent,
              let attempt,
              let question = currentQuestion else { return }
        let value = answers[question.slot] ?? question.savedAnswer ?? ""
        localReviewContext = GoatArenaLocalReviewContextStore.merge(
            matchId: matchId,
            attemptId: attempt.attemptId,
            question: .init(
                slot: question.slot,
                questionVersionId: question.questionVersionId,
                statement: question.stem,
                inputMode: question.inputMode,
                studentAnswer: value
            )
        )
    }

    // MARK: Copy

    private enum PlayOperation {
        case start
        case answer
        case submit
    }

    private func playErrorMessage(
        _ error: Error,
        operation: PlayOperation
    ) -> String {
        if error is DecodingError || error is GoatArenaPlayError {
            return "앱과 서버의 경기 정보 형식을 확인할 수 없습니다. GOAT Arena 화면을 새로고침한 뒤 다시 시도해 주세요."
        }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost,
                    .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
                return "서버에 연결하지 못했습니다. Wi-Fi 연결을 확인한 뒤 다시 시도해 주세요."
            case .timedOut:
                return "서버 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요."
            default:
                break
            }
        }

        if let apiError = error as? ServerAPIError {
            switch apiError.code {
            case "MATCH_START_DEADLINE_PASSED":
                return "경기 시작 마감이 지났습니다. GOAT Arena 화면에서 서버 상태를 다시 확인해 주세요."
            case "ARENA_ATTEMPT_EXPIRED", "ARENA_ATTEMPT_DEADLINE_PASSED":
                return "개인 제한 시간이 끝났습니다. 남아 있는 답안을 최종 제출해 주세요."
            case "GOAT_ARENA_QUESTION_PACK_NOT_READY", "MATCH_QUESTION_PACK_NOT_READY":
                return "경기 문제를 준비하고 있습니다. 잠시 후 다시 시도해 주세요."
            case "GOAT_ARENA_MATCH_NOT_FOUND", "MATCH_NOT_FOUND":
                return "현재 계정에서 이 경기를 찾을 수 없습니다. GOAT Arena 화면을 새로고침해 주세요."
            case "POLICY_PENDING", "ARENA_ATTEMPT_POLICY_PENDING":
                return "경기 운영 기준을 확인하고 있습니다. 잠시 후 다시 시도해 주세요."
            default:
                if apiError.statusCode == 401 {
                    return "로그인 시간이 만료되었습니다. 다시 로그인한 뒤 경기를 이어 주세요."
                }
                if apiError.statusCode == 409 {
                    return "경기 상태가 바뀌었습니다. GOAT Arena 화면을 새로고침한 뒤 다시 시도해 주세요."
                }
            }
        }

        switch operation {
        case .start:
            return "경기를 열지 못했습니다. 잠시 후 다시 시도해 주세요."
        case .answer:
            return "답안을 서버에 저장하지 못했습니다. 로컬 임시 답안은 보존되어 있으니 다시 시도해 주세요."
        case .submit:
            return "최종 제출을 확인하지 못했습니다. 답안은 보존되어 있으니 다시 시도해 주세요."
        }
    }

    private func roleTitle(_ role: String) -> String {
        role == "CHALLENGER" ? "도전자 개인 경기" : "방어자 개인 경기"
    }

    private func timeText(_ seconds: Int) -> String {
        let clamped = max(0, seconds)
        let hours = clamped / 3600
        let minutes = (clamped % 3600) / 60
        let remainder = clamped % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, remainder)
        }
        return String(format: "%d:%02d", minutes, remainder)
    }
}

#if DEBUG
private enum GoatArenaMatchFixture {
    static func make(
        matchId: String
    ) -> (
        attempt: ServerAPI.GoatArenaAttempt,
        questionPack: ServerAPI.GoatArenaQuestionPack,
        endsAt: Date
    ) {
        let now = Date()
        let endsAt = now.addingTimeInterval(25 * 60)
        let commonDeadline = now.addingTimeInterval(40 * 60)
        let formatter = ISO8601DateFormatter()
        let packId = "fixture-question-pack"

        let questions: [ServerAPI.GoatArenaQuestionPack.Question] = [
            .init(
                slot: 1,
                questionVersionId: "fixture-q1-v1",
                stem: "함수 \\(f(x)=x^3-3x\\)의 극댓값과 극솟값의 차를 구하세요.",
                choices: [
                    .init(key: "1", text: "2"),
                    .init(key: "2", text: "4"),
                    .init(key: "3", text: "6"),
                    .init(key: "4", text: "8")
                ],
                inputMode: "MULTIPLE_CHOICE",
                scoreWeight: 20,
                targetDifficulty: 0.58,
                calibratedDifficulty: 0.59,
                advanced: false),
            .init(
                slot: 2,
                questionVersionId: "fixture-q2-v1",
                stem: "방정식 \\(2^{x+1}=16\\)을 만족하는 \\(x\\)를 구하세요.",
                choices: nil,
                inputMode: "SHORT_ANSWER",
                scoreWeight: 20,
                targetDifficulty: 0.42,
                calibratedDifficulty: 0.41,
                advanced: false),
            .init(
                slot: 3,
                questionVersionId: "fixture-q3-v1",
                stem: "수열 \\(a_n=3n-1\\)의 첫째항부터 제10항까지의 합을 구하세요.",
                choices: nil,
                inputMode: "SHORT_ANSWER",
                scoreWeight: 20,
                targetDifficulty: 0.51,
                calibratedDifficulty: 0.52,
                advanced: false),
            .init(
                slot: 4,
                questionVersionId: "fixture-q4-v1",
                stem: "\\(\\int_0^2 (3x^2+1)\\,dx\\)의 값을 구하세요.",
                choices: [
                    .init(key: "1", text: "8"),
                    .init(key: "2", text: "10"),
                    .init(key: "3", text: "12"),
                    .init(key: "4", text: "14")
                ],
                inputMode: "MULTIPLE_CHOICE",
                scoreWeight: 20,
                targetDifficulty: 0.62,
                calibratedDifficulty: 0.63,
                advanced: false),
            .init(
                slot: 5,
                questionVersionId: "fixture-q5-v1",
                stem: "두 사건 \\(A, B\\)가 독립이고 \\(P(A)=\\frac12\\), \\(P(B)=\\frac13\\)일 때 \\(P(A\\cap B)\\)를 구하세요.",
                choices: nil,
                inputMode: "SHORT_ANSWER",
                scoreWeight: 20,
                targetDifficulty: 0.67,
                calibratedDifficulty: 0.66,
                advanced: true)
        ]

        let attempt = ServerAPI.GoatArenaAttempt(
            attemptId: "fixture-attempt",
            matchId: matchId,
            participantRole: "CHALLENGER",
            questionPackId: packId,
            questionPackVersion: "1",
            scoringPolicyVersion: "RANKED-2026-08",
            timingPolicyVersion: "RANKED-25M",
            status: "IN_PROGRESS",
            questionCount: questions.count,
            timeLimitSeconds: 25 * 60,
            startedAt: formatter.string(from: now),
            endsAt: formatter.string(from: endsAt),
            commonSubmitsBy: formatter.string(from: commonDeadline),
            networkReconnectGraceMs: 30_000,
            recognizedHeartbeatActiveMs: 92_000,
            submittedAt: nil,
            evidenceDeadlineAt: nil,
            evidenceRequired: false)

        let questionPack = ServerAPI.GoatArenaQuestionPack(
            questionPackId: packId,
            matchId: matchId,
            participantRole: "CHALLENGER",
            packVersion: "1",
            curriculumVersion: "2026-08",
            questionVersion: "1",
            scoringPolicyVersion: "RANKED-2026-08",
            questionCount: questions.count,
            timeLimitSeconds: 25 * 60,
            questions: questions,
            sealedAt: formatter.string(from: now))

        return (attempt, questionPack, endsAt)
    }
}
#endif

// MARK: - Serialized command channel

/// Swift actor는 네트워크 await 중 재진입될 수 있다. 별도 gate를 잡아
/// heartbeat·focus·answer·submit이 실제로 한 요청씩 끝난 뒤 다음 요청을 보낸다.
private actor GoatArenaEventChannel {
    let matchId: String
    let clientBuildVersion: String
    let accountSlot: String
    private var requestInFlight = false
    private var requestWaiters: [CheckedContinuation<Void, Never>] = []

    init(matchId: String, clientBuildVersion: String, accountSlot: String) {
        self.matchId = matchId
        self.clientBuildVersion = clientBuildVersion
        self.accountSlot = accountSlot
    }

    private func acquireRequestTurn() async {
        if !requestInFlight {
            requestInFlight = true
            return
        }
        await withCheckedContinuation { continuation in
            requestWaiters.append(continuation)
        }
    }

    private func releaseRequestTurn() {
        if requestWaiters.isEmpty {
            requestInFlight = false
        } else {
            requestWaiters.removeFirst().resume()
        }
    }

    private func assertAccountStillCurrent() throws {
        guard DataScope.slot == accountSlot else {
            throw GoatArenaPlayError.accountChanged
        }
    }

    func heartbeat() async throws -> ServerAPI.GoatArenaEvent {
        await acquireRequestTurn()
        defer { releaseRequestTurn() }
        try assertAccountStillCurrent()
        return try await ServerAPI.postGoatArenaHeartbeat(
            matchId: matchId,
            eventId: UUID().uuidString,
            clientBuildVersion: clientBuildVersion
        )
    }

    func focus(slot: Int) async throws -> ServerAPI.GoatArenaEvent {
        await acquireRequestTurn()
        defer { releaseRequestTurn() }
        try assertAccountStillCurrent()
        return try await ServerAPI.postGoatArenaFocus(
            matchId: matchId,
            questionSlot: slot,
            eventId: UUID().uuidString,
            clientBuildVersion: clientBuildVersion
        )
    }

    func saveAnswer(
        slot: Int,
        answer: String,
        commandId: String
    ) async throws -> ServerAPI.GoatArenaEvent {
        await acquireRequestTurn()
        defer { releaseRequestTurn() }
        try assertAccountStillCurrent()
        return try await ServerAPI.saveGoatArenaAnswer(
            matchId: matchId,
            questionSlot: slot,
            answer: answer,
            eventId: commandId,
            clientBuildVersion: clientBuildVersion
        )
    }

    func networkState(_ state: String) async throws -> ServerAPI.GoatArenaEvent {
        await acquireRequestTurn()
        defer { releaseRequestTurn() }
        try assertAccountStillCurrent()
        return try await ServerAPI.postGoatArenaNetworkState(
            matchId: matchId,
            state: state,
            eventId: UUID().uuidString,
            clientBuildVersion: clientBuildVersion
        )
    }

    func submit(commandId: String) async throws -> ServerAPI.GoatArenaSubmission {
        await acquireRequestTurn()
        defer { releaseRequestTurn() }
        try assertAccountStillCurrent()
        return try await ServerAPI.submitGoatArenaAttempt(
            matchId: matchId,
            submissionId: commandId,
            clientBuildVersion: clientBuildVersion
        )
    }
}

// MARK: - Server dates

private enum ArenaServerDate {
    static func parse(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }

    static func required(_ value: String, label: String) throws -> Date {
        guard let date = parse(value) else {
            throw GoatArenaPlayError.invalidDate(label)
        }
        return date
    }
}

private enum GoatArenaPlayError: LocalizedError {
    case invalidContract
    case invalidDate(String)
    case accountChanged

    var errorDescription: String? {
        switch self {
        case .invalidContract:
            return "경기 정보 계약이 일치하지 않습니다."
        case .invalidDate(let label):
            return "\(label) 형식이 올바르지 않습니다."
        case .accountChanged:
            return "로그인 계정이 변경되었습니다."
        }
    }
}

// MARK: - Account-scoped local draft

private struct GoatArenaDraft: Codable {
    let matchId: String
    let attemptId: String
    let questionPackId: String
    let currentQuestionIndex: Int
    let answers: [Int: String]
    /// nil은 구버전 초안이다. 구버전은 저장 완료 여부를 남기지 않았으므로 모든
    /// 답안을 미저장으로 간주해 한 번 안전하게 재전송한다.
    let dirtySlots: [Int]?
    /// 응답 유실 뒤에도 같은 답·같은 멱등키를 보내기 위해 초안과 함께 보존한다.
    let answerCommandIds: [Int: String]?
}

private enum GoatArenaDraftStore {
    private static let fileName = "goat-arena-match-drafts.json"

    private static var fileURL: URL {
        DataScope.url(fileName)
    }

    static func load(
        matchId: String,
        attemptId: String,
        questionPackId: String
    ) -> GoatArenaDraft? {
        guard let data = try? Data(contentsOf: fileURL),
              let drafts = try? JSONDecoder().decode([GoatArenaDraft].self, from: data)
        else {
            return nil
        }
        return drafts.first {
            $0.matchId == matchId
                && $0.attemptId == attemptId
                && $0.questionPackId == questionPackId
        }
    }

    static func save(_ draft: GoatArenaDraft) {
        var drafts = readAll().filter {
            !($0.matchId == draft.matchId && $0.attemptId == draft.attemptId)
        }
        drafts.append(draft)
        write(drafts)
    }

    static func clear(matchId: String, attemptId: String) {
        let remaining = readAll().filter {
            !($0.matchId == matchId && $0.attemptId == attemptId)
        }
        write(remaining)
    }

    private static func readAll() -> [GoatArenaDraft] {
        guard let data = try? Data(contentsOf: fileURL),
              let drafts = try? JSONDecoder().decode([GoatArenaDraft].self, from: data)
        else {
            return []
        }
        return drafts
    }

    private static func write(_ drafts: [GoatArenaDraft]) {
        guard let data = try? JSONEncoder().encode(drafts) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}

// MARK: - Stable idempotency keys

private struct GoatArenaCommandKeys: Codable {
    let matchId: String
    let startCommandId: String
    let submissionId: String
    let clientBuildVersion: String

    private enum CodingKeys: String, CodingKey {
        case matchId, startCommandId, submissionId, clientBuildVersion
    }

    init(
        matchId: String,
        startCommandId: String,
        submissionId: String,
        clientBuildVersion: String
    ) {
        self.matchId = matchId
        self.startCommandId = startCommandId
        self.submissionId = submissionId
        self.clientBuildVersion = clientBuildVersion
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        matchId = try values.decode(String.self, forKey: .matchId)
        startCommandId = try values.decode(String.self, forKey: .startCommandId)
        submissionId = try values.decode(String.self, forKey: .submissionId)
        clientBuildVersion = try values.decodeIfPresent(
            String.self,
            forKey: .clientBuildVersion
        ) ?? ServerAPI.clientBuildVersion
    }
}

private enum GoatArenaCommandKeyStore {
    private static let fileName = "goat-arena-command-keys.json"

    private static var fileURL: URL {
        DataScope.url(fileName)
    }

    static func loadOrCreate(matchId: String) -> GoatArenaCommandKeys {
        var values = readAll()
        if let existing = values.first(where: { $0.matchId == matchId }) {
            // clientBuildVersion이 없던 구버전 파일도 현재 값을 한 번 기록해 이후 앱
            // 업데이트에서 같은 명령 fingerprint가 달라지지 않게 한다.
            write(values)
            return existing
        }

        let created = GoatArenaCommandKeys(
            matchId: matchId,
            startCommandId: UUID().uuidString,
            submissionId: UUID().uuidString,
            clientBuildVersion: ServerAPI.clientBuildVersion
        )
        values.append(created)
        write(values)
        return created
    }

    static func clear(matchId: String) {
        write(readAll().filter { $0.matchId != matchId })
    }

    private static func readAll() -> [GoatArenaCommandKeys] {
        guard let data = try? Data(contentsOf: fileURL),
              let values = try? JSONDecoder().decode(
                [GoatArenaCommandKeys].self,
                from: data
              )
        else {
            return []
        }
        return values
    }

    private static func write(_ values: [GoatArenaCommandKeys]) {
        guard let data = try? JSONEncoder().encode(values) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
