//
//  GoatArenaScreen.swift
//  Matths
//
//  FINAL_LOGIC_FLOW Part V–VII와 GOAT Arena 룰북 v2.0의 iPad 읽기 화면.
//  MMR(실력)과 Arena Position(자리)을 한 순위로 섞지 않고, 30일 사이클과
//  페이백 세 조건은 서버가 내려준 판정을 그대로 표현한다.
//

import SwiftUI

struct GoatArenaScreen: View {
    private typealias Snapshot = ServerAPI.GoatArenaSnapshot

    @EnvironmentObject private var store: AppStore
    @EnvironmentObject private var screenshotGuard: ScreenshotGuard
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private enum FailureKind: Equatable {
        case offline
        case timeout
        case server
        case incompatible
    }

    private struct FailurePresentation {
        let kind: FailureKind
        let message: String
    }

    private enum SnapshotFreshness {
        case fresh(receivedAt: Date)
        case cached(savedAt: Date, failure: FailurePresentation)
    }

    private struct LoadedContent {
        let snapshot: Snapshot
        let freshness: SnapshotFreshness
    }

    private struct MatchLaunch: Identifiable {
        let id: String
    }

    private struct DecisionPresentation {
        let icon: String
        let title: String
        let detail: String
        let badge: String
        let tint: Color
        let background: Color
    }

    private enum LoadState {
        case idle
        case loading
        case signedOut
        case loaded(LoadedContent)
        case failed(FailurePresentation)
    }

    @State private var state: LoadState = .idle
    @State private var requestID = UUID()
    @State private var isRefreshing = false
    @State private var matchLaunch: MatchLaunch?
    @State private var loadedAccountSlot: String?
    @State private var defenderCommandInFlight: GoatArenaDefenderCommandAction?
    @State private var pendingDefenderCommand: GoatArenaPendingDefenderCommand?
    @State private var defenderCommandReceipt: ServerAPI.GoatArenaMatchCommandResponse.Match?
    @State private var confirmDefenderAccept = false
    @State private var confirmDefenderDecline = false
    @State private var defenderCommandError: String?
    /// 401(세션 만료) 오류 알림에만 "다시 로그인" 버튼을 붙이기 위한 표식.
    /// 문구가 "다시 로그인한 뒤 …" 라고 지시하면서 수단은 홈 배너에만 있으면,
    /// 401 로 키체인 토큰이 지워진 채 authProvider 만 남은 사용자는 로그인된
    /// 것처럼 보이는 화면에서 같은 오류만 반복해서 만난다.
    @State private var defenderCommandErrorIsAuthExpired = false
    @State private var showsRulebook = false
    @State private var showsMainMatchMaker = false
    @State private var isCreatingSubMatch = false
    @State private var subMatchCommandId = UUID().uuidString
    @State private var subMatchCreateError: String?

    private var snapshot: Snapshot? {
        loadedContent?.snapshot
    }

    private var loadedContent: LoadedContent? {
        guard case .loaded(let value) = state else { return nil }
        return value
    }

    private var hasFreshSnapshot: Bool {
        guard let loadedContent,
              case .fresh = loadedContent.freshness else {
            return false
        }
        return true
    }

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    private var isBusy: Bool {
        if case .loading = state { return true }
        return isRefreshing
    }

    var body: some View {
        // 세션 만료·비로그인은 죽은 게이트 대신 순위표 미리보기 화면으로 —
        // 로그인 배너와 예시 순위표는 RankArenaScreen 이 담당한다(3차 리디자인).
        if case .signedOut = state {
            RankArenaScreen()
        } else {
            arenaBody
        }
    }

    private var arenaBody: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s8) {
            header
                .entrance(0)

            hero
                .entrance(1)

            if let loadedContent {
                if case .cached = loadedContent.freshness {
                    staleSnapshotNotice(loadedContent)
                        .entrance(2)
                }

                let snapshot = loadedContent.snapshot
                if snapshot.cycle != nil {
                    if let match = snapshot.activeMatch {
                        activeMatchSection(match)
                            .entrance(3)
                    }

                    if let invitation = snapshot.pendingInvitation {
                        pendingInvitationSection(invitation)
                            .entrance(3)
                    }

                    accessWindowSection(snapshot)
                        .entrance(4)

                    paybackSection(snapshot)
                        .entrance(5)

                    assetSection(snapshot)
                        .entrance(6)
                } else {
                    noCycleGuide(snapshot)
                        .entrance(3)
                }

                rankingSection(snapshot)
                    .entrance(7)

                truthNotice(snapshot)
                    .entrance(8)
            }
        }
        .task {
            #if DEBUG
            if applyDebugFixtureIfPresent() { return }
            #endif
            guard case .idle = state else { return }
            await load()
        }
        .onReceive(NotificationCenter.default.publisher(for: DataScope.didSwitchNotification)) {
            guard let newSlot = $0.object as? String, newSlot != loadedAccountSlot else { return }
            // 이전 계정의 snapshot·명령 응답·경기 진입을 새 학생 화면에 남기지 않는다.
            requestID = UUID()
            state = .idle
            isRefreshing = false
            matchLaunch = nil
            loadedAccountSlot = nil
            defenderCommandInFlight = nil
            pendingDefenderCommand = nil
            defenderCommandReceipt = nil
            defenderCommandError = nil
            defenderCommandErrorIsAuthExpired = false
            showsMainMatchMaker = false
            isCreatingSubMatch = false
            subMatchCommandId = UUID().uuidString
            subMatchCreateError = nil
            Task { await load() }
        }
        .fullScreenCover(item: $matchLaunch, onDismiss: {
            Task { await load() }
        }) { launch in
            GoatArenaMatchPlayScreen(matchId: launch.id)
                .protectedAssessmentPresentation(
                    "goat-arena-match",
                    guardModel: screenshotGuard
                ) { stuckPoint in
                    store.recordStuckPoint(stuckPoint)
                }
        }
        .sheet(isPresented: $showsRulebook) {
            GoatArenaRulebookScreen()
        }
        .sheet(isPresented: $showsMainMatchMaker) {
            GoatArenaMainMatchSheet(
                onMatchCreated: { matchId in
                    showsMainMatchMaker = false
                    Task { @MainActor in
                        await Task.yield()
                        matchLaunch = MatchLaunch(id: matchId)
                    }
                },
                onInvitationCreated: {
                    Task { await load() }
                })
        }
        .confirmationDialog(
            "자리 도전을 수락할까요?",
            isPresented: $confirmDefenderAccept,
            titleVisibility: .visible
        ) {
            Button("수락하고 경기 준비") {
                Task {
                    await respondToDefenderChallenge(action: .accept)
                }
            }
            Button("취소", role: .cancel) {}
        } message: {
            Text("수락하면 서버가 이 경기를 시작 가능 상태로 전환합니다. 이후에는 이 화면에서 개인 경기를 시작합니다.")
        }
        .confirmationDialog(
            "자리 도전을 거절할까요?",
            isPresented: $confirmDefenderDecline,
            titleVisibility: .visible
        ) {
            if let pending = pendingDefenderCommand,
               pending.action == .decline,
               let reason = pending.reasonCode {
                Button(
                    "\(declineReasonLabel(reason)) 사유로 다시 확인",
                    role: .destructive
                ) {
                    Task {
                        await respondToDefenderChallenge(
                            action: .decline,
                            reasonCode: reason
                        )
                    }
                }
            } else {
                ForEach(
                    ServerAPI.GoatArenaDeclineReasonCode.allCases,
                    id: \.rawValue
                ) { reason in
                    Button(declineReasonLabel(reason), role: .destructive) {
                        Task {
                            await respondToDefenderChallenge(
                                action: .decline,
                                reasonCode: reason
                            )
                        }
                    }
                }
            }
            Button("취소", role: .cancel) {}
        } message: {
            Text("거절 사유 코드만 서버에 전달되며 자유 문구나 자리·일수 정보는 보내지 않습니다. 거절 뒤에는 이 경기를 시작할 수 없습니다.")
        }
        .alert(
            "경기 응답을 확인하지 못했습니다",
            isPresented: Binding(
                get: { defenderCommandError != nil },
                set: {
                    if !$0 {
                        defenderCommandError = nil
                        defenderCommandErrorIsAuthExpired = false
                    }
                }
            )
        ) {
            // 세션 만료면 문구가 지시하는 행동을 이 자리에서 제공한다 —
            // 홈 대시보드의 statusAction("다시 로그인")과 같은 동선(signOut → 인증 화면).
            if defenderCommandErrorIsAuthExpired {
                Button("다시 로그인") { store.signOut() }
            }
            Button("확인", role: .cancel) {}
        } message: {
            Text(defenderCommandError ?? "")
        }
        .alert(
            "상대 찾기를 완료하지 못했습니다",
            isPresented: Binding(
                get: { subMatchCreateError != nil },
                set: { if !$0 { subMatchCreateError = nil } }
            )
        ) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(subMatchCreateError ?? "")
        }
    }

    // MARK: Header

    private var header: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s4) {
                    headerTitle
                    Spacer(minLength: Tokens.Space.s3)
                    headerSyncControl
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    headerTitle
                    headerSyncControl
                }
            }

            ExamRule()

            if dynamicTypeSize.isAccessibilitySize {
                headerActions
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .center, spacing: Tokens.Space.s4) {
                        headerDescription
                        Spacer(minLength: Tokens.Space.s3)
                        headerActions
                    }

                    VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                        headerDescription
                        headerActions
                    }
                }
            }
        }
    }

    private var headerDescription: some View {
        Text("매일의 학습으로 페이백 조건을 채우고, 직접 대결로 Arena 자리를 차지합니다.")
            .font(.mCallout)
            .foregroundStyle(Tokens.text2)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var rulebookButton: some View {
        Button {
            showsRulebook = true
        } label: {
            Label("공식 룰북", systemImage: "book.closed")
                .font(.mCaption)
                .frame(minHeight: 44)
        }
        .buttonStyle(SecondaryButtonStyle())
        .accessibilityHint("GOAT Arena의 공식 경기 규칙을 엽니다")
    }

    private var commerceButton: some View {
        Button {
            store.route = .commerce
        } label: {
            Label("상점·이용권", systemImage: "bag")
                .font(.mCaption)
                .frame(minHeight: 44)
        }
        .buttonStyle(SecondaryButtonStyle())
        .accessibilityHint("기간 이용권과 Ranked 상점을 한곳에서 확인합니다")
    }

    private var headerActions: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Tokens.Space.s3) {
                commerceButton
                rulebookButton
            }
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                commerceButton
                rulebookButton
            }
        }
    }

    private var headerTitle: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            if !dynamicTypeSize.isAccessibilitySize {
                Text("수학으로 겨루는 1대1 Arena")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text3)
            }
            Text("GOAT Arena")
                .font(.mTitle)
                .foregroundStyle(Tokens.ink)
                .accessibilityAddTraits(.isHeader)
        }
    }

    @ViewBuilder
    private var headerSyncControl: some View {
        if isBusy {
            HStack(spacing: Tokens.Space.s2) {
                ProgressView()
                    .controlSize(.small)
                Text(isRefreshing ? "기록 갱신 중" : "불러오는 중")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
            }
            .frame(minHeight: 44)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(isRefreshing ? "GOAT Arena 기록 갱신 중" : "GOAT Arena 불러오는 중")
        } else if let loadedContent {
            HStack(spacing: Tokens.Space.s2) {
                Label(
                    freshnessShortLabel(loadedContent.freshness),
                    systemImage: freshnessIcon(loadedContent.freshness))
                    .font(.mCaption)
                    .foregroundStyle(freshnessTint(loadedContent.freshness))
                    .lineLimit(1)

                Button {
                    Task { await load() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.body.weight(.semibold))
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(Tokens.primary)
                .accessibilityLabel("Arena 기록 새로고침")
                .accessibilityHint("서버의 최신 기록을 다시 불러옵니다")
            }
        }
    }

    private func freshnessShortLabel(_ freshness: SnapshotFreshness) -> String {
        switch freshness {
        case .fresh:
            return "최신 기록"
        case .cached(let savedAt, _):
            return "\(relativeTime(savedAt)) 기록"
        }
    }

    private func freshnessIcon(_ freshness: SnapshotFreshness) -> String {
        switch freshness {
        case .fresh:
            return "checkmark.circle.fill"
        case .cached(_, let failure):
            return failure.kind == .offline ? "wifi.slash" : "clock.arrow.circlepath"
        }
    }

    private func freshnessTint(_ freshness: SnapshotFreshness) -> Color {
        switch freshness {
        case .fresh:
            return Tokens.successInk
        case .cached:
            return Tokens.warningInk
        }
    }

    // MARK: Hero

    private var hero: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Tokens.arenaAccent)
                .frame(height: 3)
                .accessibilityHidden(true)

            Group {
                switch state {
                case .idle, .loading:
                    loadingHero
                case .signedOut:
                    signedOutHero
                case .failed(let failure):
                    failedHero(failure)
                case .loaded(let content):
                    loadedHero(content.snapshot)
                }
            }
            .padding(isCompact ? Tokens.Space.s5 : Tokens.Space.s6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Tokens.brandNavy)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                .strokeBorder(Tokens.brandCyan.opacity(0.26), lineWidth: 1)
        }
    }

    private var onNavy: Color { Tokens.onNavy }

    private var loadingHero: some View {
        HStack(spacing: Tokens.Space.s4) {
            ProgressView()
                .tint(onNavy)
            VStack(alignment: .leading, spacing: 3) {
                Text("내 30일 사이클을 확인하고 있습니다")
                    .font(.mBodyB)
                    .foregroundStyle(onNavy)
                Text("출석·일수·Arena 자리 데이터를 서버에서 불러옵니다.")
                    .font(.mCaption)
                    .foregroundStyle(onNavy.opacity(0.66))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 132, alignment: .leading)
    }

    private var signedOutHero: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            heroEyebrow("계정 연결 필요", color: Color(hex: 0xFFD66B))
            Text("로그인하면 내 사이클이 이어집니다")
                .font(.mHeading)
                .foregroundStyle(onNavy)
            Text("학습 기기와 관계없이 같은 출석·일수·Arena 자리를 보려면 Matths 계정이 필요합니다.")
                .font(.mCallout)
                .foregroundStyle(onNavy.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
            heroButton("로그인하기") {
                store.signOut()
            }
        }
    }

    private func failedHero(_ failure: FailurePresentation) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            heroEyebrow(failureEyebrow(failure.kind), color: Color(hex: 0xFFD66B))
            Text(failureTitle(failure.kind))
                .font(.mHeading)
                .foregroundStyle(onNavy)
            Text(failure.message)
                .font(.mCallout)
                .foregroundStyle(onNavy.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
            heroButton("다시 시도") {
                Task { await load() }
            }
            .accessibilityHint("서버의 GOAT Arena 기록을 다시 불러옵니다")
        }
    }

    private func failureEyebrow(_ kind: FailureKind) -> String {
        switch kind {
        case .offline: return "오프라인"
        case .timeout: return "응답 지연"
        case .server: return "서버 연결 확인"
        case .incompatible: return "업데이트 필요"
        }
    }

    private func failureTitle(_ kind: FailureKind) -> String {
        switch kind {
        case .offline: return "인터넷 연결이 필요합니다"
        case .timeout: return "서버 응답이 늦어지고 있습니다"
        case .server: return "Arena 기록을 불러오지 못했습니다"
        case .incompatible: return "앱과 서버 버전을 확인해 주세요"
        }
    }

    @ViewBuilder
    private func loadedHero(_ snapshot: Snapshot) -> some View {
        if let cycle = snapshot.cycle {
            cycleHero(snapshot, cycle: cycle)
        } else {
            noCycleHero(snapshot)
        }
    }

    @ViewBuilder
    private func cycleHero(_ snapshot: Snapshot, cycle: Snapshot.Cycle) -> some View {
        if isCompact || dynamicTypeSize.isAccessibilitySize {
            compactCycleHero(snapshot, cycle: cycle)
        } else {
            regularCycleHero(snapshot, cycle: cycle)
        }
    }

    private func compactCycleHero(_ snapshot: Snapshot, cycle: Snapshot.Cycle) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s3) {
                    heroIdentity(snapshot)
                    Spacer(minLength: Tokens.Space.s2)
                    heroEyebrow(phaseLabel(cycle), color: phaseColor(cycle))
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    heroIdentity(snapshot)
                    heroEyebrow(phaseLabel(cycle), color: phaseColor(cycle))
                }
            }

            HStack(alignment: .bottom, spacing: Tokens.Space.s3) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s2) {
                    Text("진행일")
                        .font(.mMicro)
                        .foregroundStyle(onNavy.opacity(0.55))
                    Text("\(cycle.cycleDay ?? 0)")
                        .font(Font.stat(dynamicTypeSize.isAccessibilitySize ? 34 : 42))
                        .foregroundStyle(onNavy)
                        .monospacedDigit()
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                    Text("/ 30")
                        .font(.mStat)
                        .foregroundStyle(onNavy.opacity(0.5))
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                }
                .layoutPriority(1)
                Spacer(minLength: Tokens.Space.s2)
                VStack(alignment: .leading, spacing: 3) {
                    Text("현재 모드")
                        .font(.mMicro)
                        .foregroundStyle(onNavy.opacity(0.52))
                    Text(ArenaDisplayTerms.mode(cycle.activeRanking))
                        .font(.mBodyB)
                        .foregroundStyle(onNavy)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .layoutPriority(1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(
                "30일 중 \(cycle.cycleDay ?? 0)일차, 현재 \(ArenaDisplayTerms.mode(cycle.activeRanking))")

            cycleRunline(day: cycle.cycleDay ?? 0)
            heroPrimaryAction(snapshot, cycle: cycle)
        }
    }

    private func regularCycleHero(_ snapshot: Snapshot, cycle: Snapshot.Cycle) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s6) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s4) {
                    heroIdentity(snapshot)
                    Spacer(minLength: Tokens.Space.s3)
                    heroEyebrow(
                        phaseLabel(cycle),
                        color: phaseColor(cycle))
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    heroIdentity(snapshot)
                    heroEyebrow(
                        phaseLabel(cycle),
                        color: phaseColor(cycle))
                }
            }

            HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s3) {
                Text("진행일")
                    .font(.mMicro)
                    .foregroundStyle(onNavy.opacity(0.55))
                Text("\(cycle.cycleDay ?? 0)")
                    .font(Font.stat(dynamicTypeSize.isAccessibilitySize ? 40 : 54))
                    .foregroundStyle(onNavy)
                    .monospacedDigit()
                Text("/ 30")
                    .font(.mStat)
                    .foregroundStyle(onNavy.opacity(0.5))
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("30일 중 \(cycle.cycleDay ?? 0)일차")

            cycleRunline(day: cycle.cycleDay ?? 0)

            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s8) {
                    heroMetric(
                        label: "현재 경쟁 풀",
                        value: rankingLabel(cycle.activeRanking))
                    heroMetric(
                        label: "페이백 점수",
                        value: "\(cycle.balances.refundAvailableDays)점")
                    heroMetric(
                        label: "완료한 직접 대결",
                        value: "\(cycle.challenges.completed)회")
                }
                .fixedSize(horizontal: true, vertical: false)

                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    heroMetric(
                        label: "현재 경쟁 풀",
                        value: rankingLabel(cycle.activeRanking))
                    HStack(alignment: .top, spacing: Tokens.Space.s8) {
                        heroMetric(
                            label: "페이백 점수",
                            value: "\(cycle.balances.refundAvailableDays)점")
                        heroMetric(
                            label: "완료한 직접 대결",
                            value: "\(cycle.challenges.completed)회")
                    }
                }
            }

            Text(cycleFootnote(cycle))
                .font(.mCaption)
                .foregroundStyle(onNavy.opacity(0.66))
                .fixedSize(horizontal: false, vertical: true)

            heroPrimaryAction(snapshot, cycle: cycle)
        }
    }

    @ViewBuilder
    private func heroPrimaryAction(_ snapshot: Snapshot, cycle: Snapshot.Cycle) -> some View {
        if let match = snapshot.activeMatch, canPlay(match) {
            Button {
                guard let matchId = match.id?.trimmingCharacters(in: .whitespacesAndNewlines),
                      !matchId.isEmpty else { return }
                matchLaunch = MatchLaunch(id: matchId)
            } label: {
                Label(
                    needsEvidenceSubmission(match)
                        ? "풀이 증거 제출하기"
                        : (match.attempt?.status == "IN_PROGRESS"
                            ? "경기 계속하기" : "경기 시작하기"),
                    systemImage: needsEvidenceSubmission(match)
                        ? "photo.badge.arrow.down"
                        : (match.attempt?.status == "IN_PROGRESS"
                            ? "arrow.right.circle.fill" : "play.fill"))
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(PrimaryButtonStyle())
        } else if snapshot.ranking.skill.status == "PLACEMENT_PENDING" {
            Button {
                store.route = .placement
            } label: {
                Label("배치고사 시작 또는 이어하기", systemImage: "list.number")
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(PrimaryButtonStyle())
        } else if snapshot.activeMatch == nil,
                  cycle.phase == "PAID_ACCESS",
                  (cycle.cycleDay ?? 0) <= (cycle.challenges.newRequestCutoffDay ?? 28) {
            if cycle.activeRanking == "MAIN" {
                Button {
                    showsMainMatchMaker = true
                } label: {
                    HStack(spacing: Tokens.Space.s3) {
                        Image(systemName: "person.2.fill")
                        Text("Ranked 상대 찾기")
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                        Spacer(minLength: Tokens.Space.s3)
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(isRefreshing)
                .accessibilityHint("앱 안에서 Ranked 티어와 예치 일수를 선택합니다")
            } else {
                Button {
                    Task { await createUnrankedMatch() }
                } label: {
                    HStack(spacing: Tokens.Space.s3) {
                        if isCreatingSubMatch {
                            ProgressView()
                                .tint(Tokens.onPrimary)
                        } else {
                            Image(systemName: "person.2.fill")
                        }
                        Text(isCreatingSubMatch ? "상대 찾는 중" : "Unranked 상대 찾기")
                            .lineLimit(1)
                        Spacer(minLength: Tokens.Space.s3)
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(isCreatingSubMatch || isRefreshing)
                .accessibilityHint("현재 자격을 다시 확인하고 공식 Unranked 경기를 만듭니다")
            }
        }

        if cycle.activeRanking == "MAIN" {
            Button {
                store.route = .arenaShop
            } label: {
                HStack(spacing: Tokens.Space.s3) {
                    Image(systemName: "bag.fill")
                    Text("Ranked 상점")
                    Spacer(minLength: Tokens.Space.s3)
                    Image(systemName: "chevron.right")
                }
                .font(.mBodyB)
                .foregroundStyle(onNavy)
                .padding(.horizontal, Tokens.Space.s5)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(onNavy.opacity(0.09), in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(onNavy.opacity(0.22), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityHint("학습일로 이용하는 Ranked 전용 기능을 엽니다")
        }
    }

    private func noCycleHero(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s4) {
                    heroIdentity(snapshot)
                    Spacer(minLength: Tokens.Space.s3)
                    heroEyebrow("사이클 시작 전", color: onNavy.opacity(0.68))
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    heroIdentity(snapshot)
                    heroEyebrow("사이클 시작 전", color: onNavy.opacity(0.68))
                }
            }

            Text("현재 활성 30일 사이클이 없습니다")
                .font(.mHeading)
                .foregroundStyle(onNavy)

            Text("기존 MMR은 그대로 보존됩니다. 패키지 결제가 승인되면 Day 1과 Unranked 랭킹이 서버에서 자동으로 열립니다.")
                .font(.mCallout)
                .foregroundStyle(onNavy.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func heroIdentity(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(snapshot.identity.displayName)
                .font(.mHeading)
                .foregroundStyle(onNavy)
            Text(identityDetail(snapshot))
                .font(.mCaption)
                .foregroundStyle(onNavy.opacity(0.62))
        }
        .accessibilityElement(children: .combine)
    }

    private func cycleRunline(day: Int) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            HStack(spacing: 2) {
                ForEach(1...30, id: \.self) { value in
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(runlineColor(value: value, day: day))
                        .frame(maxWidth: .infinity)
                        .overlay {
                            if value == 30 {
                                RoundedRectangle(cornerRadius: 1.5)
                                    .strokeBorder(Color(hex: 0xFFD66B).opacity(0.8), lineWidth: 1)
                            }
                        }
                }
            }
            .frame(height: 12)
            .accessibilityHidden(true)

            ViewThatFits(in: .horizontal) {
                HStack {
                    Text("1일차")
                    Spacer()
                    Text("유료 이용 DAY 29")
                    Spacer()
                    Text("30일차 완료 심사")
                        .foregroundStyle(Color(hex: 0xFFD66B))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("1–29일차 · 유료 이용")
                    Text("30일차 · 완료 심사")
                        .foregroundStyle(Color(hex: 0xFFD66B))
                }
            }
            .font(.mMicro)
            .foregroundStyle(onNavy.opacity(0.48))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "30일 진행선. 현재 \(max(day, 0))일차. 1일부터 29일까지 유료 이용, 30일은 Completion Pass")
    }

    private func runlineColor(value: Int, day: Int) -> Color {
        if value < day {
            return Tokens.brandCyan.opacity(0.72)
        }
        if value == day {
            return onNavy
        }
        return onNavy.opacity(0.14)
    }

    private func heroMetric(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.mMicro)
                .foregroundStyle(onNavy.opacity(0.52))
            Text(value)
                .font(.mStat)
                .foregroundStyle(onNavy)
                .monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    private func heroEyebrow(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.mMicro)
            .foregroundStyle(color)
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 30)
            .background(onNavy.opacity(0.09), in: Capsule())
    }

    private func heroButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.mBodyB)
                .foregroundStyle(Tokens.brandNavy)
                .padding(.horizontal, Tokens.Space.s5)
                .frame(minHeight: 44)
                .background(onNavy, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
        }
        .buttonStyle(.plain)
    }

    // MARK: Freshness and access window

    private func staleSnapshotNotice(_ content: LoadedContent) -> some View {
        guard case .cached(let savedAt, let failure) = content.freshness else {
            return AnyView(EmptyView())
        }

        let notice = VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s3) {
                    staleNoticeCopy(savedAt: savedAt, failure: failure)
                    Spacer(minLength: Tokens.Space.s3)
                    retryButton
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    staleNoticeCopy(savedAt: savedAt, failure: failure)
                    retryButton
                }
            }
        }
        .padding(Tokens.Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Tokens.warningSoft)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))

        return AnyView(notice)
    }

    private func staleNoticeCopy(
        savedAt: Date,
        failure: FailurePresentation
    ) -> some View {
        HStack(alignment: .top, spacing: Tokens.Space.s3) {
            Image(systemName: failure.kind == .offline ? "wifi.slash" : "clock.arrow.circlepath")
                .foregroundStyle(Tokens.warningInk)
                .frame(width: 24, height: 24)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(failure.kind == .offline ? "오프라인 · 저장된 기록" : "최신 확인 실패 · 저장된 기록")
                    .font(.mBodyB)
                    .foregroundStyle(Tokens.ink)
                Text("\(relativeTime(savedAt))에 저장된 내용입니다. \(failure.message) 대결·일수·페이백 상태가 바뀌었을 수 있습니다.")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var retryButton: some View {
        Button {
            Task { await load() }
        } label: {
            Label("다시 확인", systemImage: "arrow.clockwise")
                .font(.mBodyB)
                .padding(.horizontal, Tokens.Space.s4)
                .frame(minHeight: 44)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.warningInk.opacity(0.35), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .foregroundStyle(Tokens.warningInk)
        .accessibilityHint("서버의 최신 Arena 기록을 다시 불러옵니다")
    }

    private func noCycleGuide(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            SectionRule(title: "사이클 시작 안내")

            statusDecisionRow(
                DecisionPresentation(
                    icon: "checkmark.shield.fill",
                    title: "MMR은 안전하게 보존됩니다",
                    detail: snapshot.ranking.skill.mmr == nil
                        ? "아직 배치 MMR이 없습니다. 사이클 시작 뒤에도 배치 상태를 서버에서 그대로 이어갑니다."
                        : "현재 MMR \(formatted(snapshot.ranking.skill.mmr!))은 새 30일 사이클과 별도로 유지됩니다.",
                    badge: "보존",
                    tint: Tokens.successInk,
                    background: Tokens.successSoft))

            DottedRule()

            statusDecisionRow(
                DecisionPresentation(
                    icon: "creditcard.and.123",
                    title: "승인된 사이클이 있는지 확인하세요",
                    detail: "패키지 결제가 승인되면 Day 1과 Unranked 랭킹이 서버에서 자동으로 열립니다. 이 화면이 결제를 완료한 것처럼 표시하지 않습니다.",
                    badge: "시작 전",
                    tint: Tokens.primary,
                    background: Tokens.primarySoft))

            Button {
                store.route = .commerce
            } label: {
                Label("이용권과 상점 보기", systemImage: "bag")
                    .font(.mBodyB)
                    .padding(.horizontal, Tokens.Space.s5)
                    .frame(minHeight: 44)
                    .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.lineStrong, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .foregroundStyle(Tokens.primary)
            .accessibilityHint("구독 상태와 결제, Ranked 상점 이용 조건을 확인합니다")
        }
    }

    private func accessWindowSection(_ snapshot: Snapshot) -> some View {
        guard let cycle = snapshot.cycle else { return AnyView(EmptyView()) }

        let section = VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            VStack(alignment: .leading, spacing: 3) {
                Text("오늘 이용 상태")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.primary)
                Text("왜 열렸고, 왜 잠겼는지")
                    .font(.mHeading)
                    .foregroundStyle(Tokens.ink)
                    .accessibilityAddTraits(.isHeader)
            }

            Text("서버가 판정한 오늘의 이용 범위와 다음 행동입니다. Day 30은 유료 이용 연장이 아니라 별도의 Completion Pass입니다.")
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 0) {
                statusDecisionRow(learningAccessPresentation(cycle))
                DottedRule()
                statusDecisionRow(challengeWindowPresentation(snapshot, cycle: cycle))
                DottedRule()
                statusDecisionRow(nextActionPresentation(snapshot, cycle: cycle))
            }

        }

        return AnyView(section)
    }

    private func statusDecisionRow(_ presentation: DecisionPresentation) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .center, spacing: Tokens.Space.s4) {
                decisionIcon(presentation)
                decisionCopy(presentation)
                Spacer(minLength: Tokens.Space.s3)
                decisionBadge(presentation)
            }

            HStack(alignment: .top, spacing: Tokens.Space.s4) {
                decisionIcon(presentation)
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    decisionCopy(presentation)
                    decisionBadge(presentation)
                }
            }
        }
        .padding(.vertical, Tokens.Space.s4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(presentation.title), \(presentation.badge). \(presentation.detail)")
    }

    private func decisionIcon(_ presentation: DecisionPresentation) -> some View {
        Image(systemName: presentation.icon)
            .font(.body.weight(.semibold))
            .foregroundStyle(presentation.tint)
            .frame(width: 44, height: 44)
            .background(presentation.background, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .accessibilityHidden(true)
    }

    private func decisionCopy(_ presentation: DecisionPresentation) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(presentation.title)
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
            Text(presentation.detail)
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func decisionBadge(_ presentation: DecisionPresentation) -> some View {
        Label(presentation.badge, systemImage: presentation.icon)
            .labelStyle(.titleOnly)
            .font(.mMicro)
            .foregroundStyle(presentation.tint)
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 30)
            .background(presentation.background, in: Capsule())
    }

    private func learningAccessPresentation(_ cycle: Snapshot.Cycle) -> DecisionPresentation {
        if ["PAYMENT_DISPUTED", "SUSPENDED"].contains(cycle.status) {
            return DecisionPresentation(
                icon: "exclamationmark.shield.fill",
                title: "학습 이용이 검토 중입니다",
                detail: cycle.status == "PAYMENT_DISPUTED"
                    ? "결제 상태 확인이 끝날 때까지 이용 권리가 잠겨 있습니다. 웹 계정의 주문 상태를 확인하세요."
                    : "계정 검토가 끝날 때까지 이용 권리가 잠겨 있습니다. 기록은 읽기 전용으로 보존됩니다.",
                badge: "검토 잠금",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }

        if cycle.phase == "COMPLETION_PASS" {
            if cycle.access.completionPassActive {
                return DecisionPresentation(
                    icon: "checkmark.seal.fill",
                    title: "Completion Pass 활동만 열려 있습니다",
                    detail: "Day 30에 서버 정책이 허용한 활동만 출석 판정에 반영됩니다. 일반 유료 학습 이용일은 Day 29에 끝났습니다.",
                    badge: "제한 이용",
                    tint: Tokens.warningInk,
                    background: Tokens.warningSoft)
            }
            return DecisionPresentation(
                icon: "clock.badge.exclamationmark",
                title: "Completion Pass 판정을 기다리고 있습니다",
                detail: "허용 시간과 활동 기준이 확정되기 전에는 앱이 Day 30 이용 가능 여부를 추측하지 않습니다.",
                badge: "정책 대기",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }

        if cycle.phase == "PAID_ACCESS", cycle.access.learningAccessActive {
            return DecisionPresentation(
                icon: "lock.open.fill",
                title: "오늘의 유료 학습이 열려 있습니다",
                detail: "Day \(cycle.cycleDay ?? 0) 학습 기록은 서버의 유효 학습 기준을 통과한 경우에만 사이클 출석에 반영됩니다.",
                badge: "이용 가능",
                tint: Tokens.successInk,
                background: Tokens.successSoft)
        }

        if cycle.phase == "UPCOMING" || cycle.status == "PAYMENT_PENDING" {
            return DecisionPresentation(
                icon: "clock.fill",
                title: "Day 1 시작을 기다리고 있습니다",
                detail: "결제 승인과 시작일 판정이 끝나면 서버가 이용 권리를 자동으로 엽니다.",
                badge: "시작 대기",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        }

        return DecisionPresentation(
            icon: "lock.fill",
            title: "일반 학습 이용 기간이 끝났습니다",
            detail: "유료 학습은 Day 1–29에만 열립니다. 현재 기록은 심사·정산을 위해 읽기 전용으로 유지됩니다.",
            badge: "기간 종료",
            tint: Tokens.text2,
            background: Tokens.paper2)
    }

    private func challengeWindowPresentation(
        _ snapshot: Snapshot,
        cycle: Snapshot.Cycle
    ) -> DecisionPresentation {
        let cutoff = cycle.challenges.newRequestCutoffDay ?? 28
        let day = cycle.cycleDay ?? 0

        if snapshot.activeMatch != nil {
            let detail: String
            if let match = snapshot.activeMatch, needsEvidenceSubmission(match) {
                detail = "답안은 고정되었지만 풀이 사진 제출이 남아 있습니다. 새 요청보다 서버 마감 안에 증거 제출을 먼저 완료하세요."
            } else if let match = snapshot.activeMatch, participantHasSubmitted(match) {
                detail = "내 답안은 제출되었습니다. 새 요청보다 상대 제출과 채점·정산 상태를 먼저 확인하세요."
            } else if let match = snapshot.activeMatch, canPlay(match) {
                detail = "새 요청보다 현재 경기를 먼저 시작하거나 이어서 제출하세요."
            } else {
                detail = "새 요청보다 현재 경기의 상태와 마감을 먼저 확인하세요."
            }
            return DecisionPresentation(
                icon: "flag.checkered",
                title: "진행 중인 자리 쟁탈전이 있습니다",
                detail: detail,
                badge: "경기 우선",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        }

        if cycle.activeRanking == "MAIN",
           snapshot.capabilities.mainArena == "POLICY_PENDING" {
            return DecisionPresentation(
                icon: "clock.badge.exclamationmark",
                title: "Ranked 운영 기준을 확인 중입니다",
                detail: "티어 간 도전 범위와 Rank Shield·Revenge 기준이 확정되기 전에는 도전을 열지 않습니다.",
                badge: "정책 대기",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }

        if day > cutoff || cycle.phase != "PAID_ACCESS" {
            return DecisionPresentation(
                icon: "lock.fill",
                title: "새 Unranked 도전 요청이 마감되었습니다",
                detail: "새 요청은 Day \(cutoff)까지만 허용됩니다. 이미 성립한 경기는 별도 마감과 정산 절차를 따릅니다.",
                badge: "신청 잠금",
                tint: Tokens.text2,
                background: Tokens.paper2)
        }

        return DecisionPresentation(
            icon: "person.2.fill",
            title: "새 상대를 찾을 수 있습니다",
            detail: "Day \(cutoff)까지 신청할 수 있습니다. 아래 버튼에서 GOAT Arena 상대 찾기를 이어가세요.",
            badge: "상대 찾기",
            tint: Tokens.arenaAccent,
            background: Tokens.primarySoft)
    }

    private func nextActionPresentation(
        _ snapshot: Snapshot,
        cycle: Snapshot.Cycle
    ) -> DecisionPresentation {
        if snapshot.payback.state == "POLICY_PENDING" {
            return DecisionPresentation(
                icon: "doc.text.magnifyingglass",
                title: "기록은 계속 쌓고, 최종 기준을 기다리세요",
                detail: "확정되지 않은 기준 때문에 판정만 보류된 상태입니다. 서버는 출석·일수·완료 경기 기록을 계속 보존합니다.",
                badge: "다음 행동",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }

        if cycle.phase == "COMPLETION_PASS" {
            return DecisionPresentation(
                icon: "arrow.right.circle.fill",
                title: cycle.access.completionPassActive
                    ? "허용된 Day 30 활동을 마무리하세요"
                    : "Completion Pass 판정 갱신을 기다리세요",
                detail: cycle.access.completionPassActive
                    ? "완료 뒤 이 화면을 새로고침해 30일 출석과 페이백 판정을 확인하세요."
                    : "운영 기준이 서버에 반영되면 이용 가능 상태와 다음 행동이 자동으로 갱신됩니다.",
                badge: "다음 행동",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        }

        if let next = snapshot.payback.conditions.first(where: { !$0.met }) {
            return DecisionPresentation(
                icon: "arrow.right.circle.fill",
                title: nextConditionAction(next),
                detail: nextConditionActionDetail(next),
                badge: "다음 행동",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        }

        if snapshot.payback.eligible == true {
            return DecisionPresentation(
                icon: "checkmark.seal.fill",
                title: "세 조건을 모두 충족했습니다",
                detail: snapshot.activeMatch == nil
                    ? "서버의 페이백 지급 절차가 열릴 때까지 원장 상태를 유지하세요."
                    : "진행 중인 경기가 정산된 뒤 최종 페이백 가능 여부가 다시 판정됩니다.",
                badge: "조건 충족",
                tint: Tokens.successInk,
                background: Tokens.successSoft)
        }

        return DecisionPresentation(
            icon: "clock.fill",
            title: "서버의 다음 판정을 기다리세요",
            detail: "사이클·무결성·정산 상태가 갱신되면 이 화면의 다음 행동도 함께 바뀝니다.",
            badge: "판정 대기",
            tint: Tokens.warningInk,
            background: Tokens.warningSoft)
    }

    private func nextConditionAction(_ condition: Snapshot.Payback.Condition) -> String {
        switch condition.key {
        case "CYCLE_ATTENDANCE":
            return "오늘의 유효 학습 기록을 채우세요"
        case "REFUND_DAY_BALANCE":
            return "페이백 점수 원장을 확인하세요"
        case "COMPLETED_SUB_CHALLENGES":
            return "완료 경기 조건을 확인하세요"
        default:
            return "남은 서버 판정 조건을 확인하세요"
        }
    }

    private func nextConditionActionDetail(_ condition: Snapshot.Payback.Condition) -> String {
        let progress = conditionCount(condition)
        switch condition.key {
        case "CYCLE_ATTENDANCE":
            return "현재 \(progress)입니다. 인정 문제 수와 유효 학습 시간은 서버 정책을 충족해야 합니다."
        case "REFUND_DAY_BALANCE":
            return "현재 \(progress)입니다. 잠긴 점수와 학습 가능 일수는 페이백 점수에 합산되지 않습니다."
        case "COMPLETED_SUB_CHALLENGES":
            return "현재 \(progress)입니다. 위의 ‘상대 찾기’에서 새 대결을 시작하면 완료 경기 수가 갱신됩니다."
        default:
            return "현재 \(progress)입니다."
        }
    }

    // MARK: Payback

    private func paybackSection(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s4) {
                    paybackHeading
                    Spacer(minLength: Tokens.Space.s3)
                    paybackVerdict(snapshot.payback)
                }

                VStack(alignment: .leading, spacing: 3) {
                    paybackHeading
                    paybackVerdict(snapshot.payback)
                }
            }

            ArenaArtBanner(
                imageName: "ArenaVaultBackdrop",
                eyebrow: "30일 사이클",
                title: "쌓인 기록이 자격을 해제합니다",
                detail: "출석과 페이백 점수를 채워 최종 판정을 여세요.")

            Text("같은 이용 주기 안에서 정책에 정한 연속 학습과 페이백 점수 기준을 함께 충족해야 합니다.")
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 0) {
                ForEach(Array(snapshot.payback.conditions.enumerated()), id: \.element.id) { index, condition in
                    if index > 0 {
                        DottedRule()
                    }
                    conditionRow(index: index + 1, condition: condition)
                }
            }

            if snapshot.payback.state == "POLICY_PENDING" {
                inlineNotice(
                    icon: "clock.badge.exclamationmark",
                    title: "최종 판정 기준 확인 중",
                    detail: policyPendingDetail(snapshot.payback),
                    tint: Tokens.warningInk,
                    background: Tokens.warningSoft)
            } else {
                ForEach(snapshot.payback.blockers) { blocker in
                    let presentation = paybackBlockerPresentation(blocker)
                    inlineNotice(
                        icon: presentation.icon,
                        title: presentation.title,
                        detail: presentation.detail,
                        tint: presentation.tint,
                        background: presentation.background)
                }
            }
        }
    }

    private var paybackHeading: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("페이백 조건")
                .font(.mMicro)
                .foregroundStyle(Tokens.primary)
            Text("페이백은 세 조건을 모두 봅니다")
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
                .accessibilityAddTraits(.isHeader)
        }
    }

    private func policyPendingDetail(_ payback: Snapshot.Payback) -> String {
        let fields = payback.blockers
            .first(where: { $0.code == "POLICY_PENDING" })?
            .fields?
            .map(policyFieldLabel) ?? []
        let unique = Array(Set(fields)).sorted()
        guard !unique.isEmpty else {
            return "출석과 대결 기록은 계속 저장됩니다. 아직 확정되지 않은 운영 기준을 앱이 임의로 채우지는 않습니다."
        }
        return "확인 중: \(unique.joined(separator: ", ")). 기록은 계속 저장되며, 앱이 기준값을 임의로 채우지 않습니다."
    }

    private func policyFieldLabel(_ field: String) -> String {
        switch field {
        case "subNormalTakeoverCostDays": return "Unranked 일반 도전 비용"
        case "subRevengeCostDays": return "Unranked 복수전 비용"
        case "minCompletedSubChallenges": return "최소 완료 경기"
        case "completionPass.opensAtKst": return "Day 30 시작 시각"
        case "completionPass.deadlineAtKst": return "Day 30 마감 시각"
        case "completionPass.allowedActivityTypes": return "Day 30 허용 활동"
        case "minRecognizedProblemsPerDay": return "일일 인정 문제 수"
        case "minValidStudySecondsPerDay": return "일일 유효 학습 시간"
        case "noShowCountsAsCompletedChallenge": return "노쇼 경기 인정"
        case "arenaTierStepMappingVersion": return "Ranked 티어 간격"
        case "revengeBypassesShield": return "Revenge·Shield 관계"
        default: return "운영 기준"
        }
    }

    private func paybackBlockerPresentation(_ blocker: Snapshot.Payback.Blocker) -> DecisionPresentation {
        switch blocker.code {
        case "ACTIVE_MATCH":
            return DecisionPresentation(
                icon: "flag.checkered",
                title: "진행 중인 대결이 있습니다",
                detail: "경기 정산이 끝난 뒤 페이백 가능 여부가 다시 판정됩니다.",
                badge: "대결 중",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        case "LOCKED_DAY_BALANCE":
            return DecisionPresentation(
                icon: "lock.fill",
                title: "대결에 맡겨 둔 일수가 있습니다",
                detail: "잠긴 일수가 정산되어 사용 가능 또는 소각·이전 처리된 뒤 다시 판정됩니다.",
                badge: "일수 잠금",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        case "INTEGRITY_REVIEW":
            return DecisionPresentation(
                icon: "exclamationmark.shield.fill",
                title: "무결성 확인이 진행 중입니다",
                detail: "검토가 끝날 때까지 페이백 판정을 보류합니다. 학습·대결 원장은 그대로 보존됩니다.",
                badge: "검토 중",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        default:
            return DecisionPresentation(
                icon: "clock.fill",
                title: "최종 판정을 기다리고 있습니다",
                detail: "서버 원장의 보류 사유가 해소되면 자동으로 다시 판정됩니다.",
                badge: "판정 대기",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }
    }

    private func conditionRow(
        index: Int,
        condition: Snapshot.Payback.Condition
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .center, spacing: Tokens.Space.s3) {
                    conditionMarker(index: index, condition: condition)
                    conditionCopy(condition)
                    Spacer(minLength: Tokens.Space.s3)
                    conditionStatus(condition)
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    HStack(alignment: .top, spacing: Tokens.Space.s3) {
                        conditionMarker(index: index, condition: condition)
                        conditionCopy(condition)
                    }
                    conditionStatus(condition)
                        .padding(.leading, 42)
                }
            }

            conditionProgress(condition)
                .padding(.leading, 42)
        }
        .padding(.vertical, Tokens.Space.s4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "\(conditionTitle(condition.key)), \(condition.met ? "완료" : conditionCount(condition)). \(conditionDetail(condition))")
    }

    private func conditionMarker(
        index: Int,
        condition: Snapshot.Payback.Condition
    ) -> some View {
        ZStack {
            Circle()
                .fill(condition.met ? Tokens.successInk : Tokens.paper2)
                .frame(width: 30, height: 30)
            if condition.met {
                Image(systemName: "checkmark")
                    .font(.caption.bold())
                    .foregroundStyle(Color.white)
            } else {
                Text("\(index)")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
            }
        }
        .accessibilityHidden(true)
    }

    private func conditionCopy(_ condition: Snapshot.Payback.Condition) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(conditionTitle(condition.key))
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
            Text(conditionDetail(condition))
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func conditionStatus(_ condition: Snapshot.Payback.Condition) -> some View {
        Label(
            condition.met ? "완료" : conditionCount(condition),
            systemImage: condition.met ? "checkmark.circle.fill" : "circle.dotted")
            .font(.mCaption)
            .foregroundStyle(condition.met ? Tokens.successInk : Tokens.text2)
            .monospacedDigit()
    }

    private func conditionProgress(_ condition: Snapshot.Payback.Condition) -> some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Tokens.paper2)
                Capsule()
                    .fill(condition.met ? Tokens.successInk : Tokens.primary)
                    .frame(width: proxy.size.width * conditionRatio(condition))
            }
        }
        .frame(height: 6)
        .accessibilityHidden(true)
    }

    private func paybackVerdict(_ payback: Snapshot.Payback) -> some View {
        let presentation = paybackPresentation(payback)
        return Text(presentation.label)
            .font(.mMicro)
            .foregroundStyle(presentation.color)
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 30)
            .background(presentation.background, in: Capsule())
            .accessibilityLabel("페이백 상태 \(presentation.label)")
    }

    // MARK: Assets

    private func assetSection(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            SectionRule(title: "Arena 자산")

            if let balances = snapshot.cycle?.balances {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 0) {
                        assetColumn(
                            eyebrow: "UNRANKED",
                            title: "페이백 점수",
                            available: balances.refundAvailableDays,
                            locked: balances.refundLockedDays,
                            unit: "점",
                            tint: Tokens.brandMagentaInk)
                        assetDivider
                        assetColumn(
                            eyebrow: "RANKED",
                            title: "학습 가능 일수",
                            available: balances.bonusAvailableDays,
                            locked: balances.bonusLockedDays,
                            unit: "일",
                            tint: Tokens.brandCyanInk)
                    }

                    VStack(spacing: Tokens.Space.s5) {
                        assetColumn(
                            eyebrow: "UNRANKED",
                            title: "페이백 점수",
                            available: balances.refundAvailableDays,
                            locked: balances.refundLockedDays,
                            unit: "점",
                            tint: Tokens.brandMagentaInk)
                        DottedRule()
                        assetColumn(
                            eyebrow: "RANKED",
                            title: "학습 가능 일수",
                            available: balances.bonusAvailableDays,
                            locked: balances.bonusLockedDays,
                            unit: "일",
                            tint: Tokens.brandCyanInk)
                    }
                }
            }

            Text("페이백 점수와 학습 가능 일수는 서로 바꾸거나 합산하지 않습니다. 대결에 예치한 값도 사용 가능한 값과 따로 표시됩니다.")
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func assetColumn(
        eyebrow: String,
        title: String,
        available: Int,
        locked: Int,
        unit: String,
        tint: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text(eyebrow)
                .font(.mMicro)
                .foregroundStyle(tint)
            Text(title)
                .font(.mBodyB)
                .foregroundStyle(Tokens.ink)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(available)")
                    .font(.mStatLarge)
                    .foregroundStyle(Tokens.ink)
                    .monospacedDigit()
                Text("\(unit) 사용 가능")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
            }
            Text(locked > 0 ? "대결에 \(locked)\(unit) 잠금" : "잠긴 \(unit) 없음")
                .font(.mCaption)
                .foregroundStyle(locked > 0 ? Tokens.warningInk : Tokens.text2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, Tokens.Space.s3)
        .accessibilityElement(children: .combine)
    }

    private var assetDivider: some View {
        Rectangle()
            .fill(Tokens.line)
            .frame(width: 1)
            .padding(.horizontal, Tokens.Space.s6)
            .accessibilityHidden(true)
    }

    // MARK: Ranking

    private func rankingSection(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            VStack(alignment: .leading, spacing: 3) {
                Text("두 가지 기준")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.primary)
                Text("실력과 자리는 다른 숫자입니다")
                    .font(.mHeading)
                    .foregroundStyle(Tokens.ink)
                    .accessibilityAddTraits(.isHeader)
            }

            Text("MMR은 시험 성과로 바뀌고, Arena Position은 직접 대결에서만 서로 교환됩니다.")
                .font(.mCallout)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            statusDecisionRow(rankingLifecyclePresentation(snapshot))

            if snapshot.ranking.skill.status == "PLACEMENT_PENDING" {
                Button {
                    store.route = .placement
                } label: {
                    Label("배치고사 시작 또는 이어하기", systemImage: "list.number")
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: isCompact ? .infinity : 360, alignment: .leading)
                .accessibilityHint("앱 안에서 배치고사 30문항을 시작하거나 저장된 지점부터 이어갑니다")
            }

            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s4) {
                    skillPanel(snapshot.ranking.skill)
                    seatPanel(
                        snapshot.ranking.seat,
                        activeRanking: snapshot.ranking.activeRanking)
                }

                VStack(spacing: Tokens.Space.s4) {
                    skillPanel(snapshot.ranking.skill)
                    seatPanel(
                        snapshot.ranking.seat,
                        activeRanking: snapshot.ranking.activeRanking)
                }
            }

            if let season = snapshot.season {
                HStack(spacing: Tokens.Space.s2) {
                    Image(systemName: "calendar")
                    Text(
                        [season.title, season.currentWeekKey]
                            .compactMap { $0 }
                            .joined(separator: " · "))
                }
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .accessibilityElement(children: .combine)
            }

            if snapshot.ranking.activeRanking == "MAIN",
               snapshot.capabilities.mainArena == "POLICY_PENDING" {
                inlineNotice(
                    icon: "clock.badge.exclamationmark",
                    title: "Ranked 운영 기준 확인 중",
                    detail: "티어 간 도전 비용과 Rank Shield·Revenge 관계가 확정되기 전에는 앱이 도전 가능 범위를 추측하지 않습니다.",
                    tint: Tokens.warningInk,
                    background: Tokens.warningSoft)
            }
        }
    }

    private func skillPanel(_ skill: Snapshot.Ranking.Skill) -> some View {
        rankingPanel(accent: Tokens.brandMagentaInk) {
            Text("실력 점수 MMR")
                .font(.mMicro)
                .foregroundStyle(Tokens.brandMagentaInk)
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .center, spacing: Tokens.Space.s4) {
                    RankBadgeView(
                        tierCode: skill.tier,
                        size: isCompact ? 82 : 96,
                        animated: true)
                    skillIdentity(skill)
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    RankBadgeView(tierCode: skill.tier, size: 86, animated: true)
                    skillIdentity(skill)
                }
            }
            rankingStatusBadge(
                label: skillStatusLabel(skill.status),
                icon: skillStatusIcon(skill.status),
                tint: skillStatusTint(skill.status))
            Text(skillStatusDetail(skill))
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "실력 MMR \(skill.mmr.map(String.init) ?? "미발급"), \(tierLabel(skill.tier)), \(skillStatusLabel(skill.status)). \(skillStatusDetail(skill))")
    }

    private func skillIdentity(_ skill: Snapshot.Ranking.Skill) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            skillValue(skill)
            Text(tierLabel(skill.tier))
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
        }
    }

    private func skillValue(_ skill: Snapshot.Ranking.Skill) -> some View {
        Text(skill.mmr.map(formatted) ?? "—")
            .font(.mStatLarge)
            .foregroundStyle(Tokens.ink)
            .monospacedDigit()
    }

    private func seatPanel(
        _ seat: Snapshot.Ranking.Seat,
        activeRanking: String?
    ) -> some View {
        rankingPanel(accent: Tokens.brandCyanInk) {
            Text("Arena 자리")
                .font(.mMicro)
                .foregroundStyle(Tokens.brandCyanInk)
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s2) {
                    seatValue(seat)
                    Text(rankingLabel(activeRanking))
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text2)
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    seatValue(seat)
                    Text(rankingLabel(activeRanking))
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text2)
                }
            }
            rankingStatusBadge(
                label: seatStatusLabel(seat.status),
                icon: seatStatusIcon(seat.status),
                tint: seatStatusTint(seat.status))
            Text(seatStatusDetail(seat))
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            "Arena 자리 \(seat.arenaPosition.map(String.init) ?? "미배정"), \(rankingLabel(activeRanking)), \(seatStatusLabel(seat.status)). \(seatStatusDetail(seat))")
    }

    private func seatValue(_ seat: Snapshot.Ranking.Seat) -> some View {
        Text(seat.arenaPosition.map { "#\($0)" } ?? "—")
            .font(.mStatLarge)
            .foregroundStyle(Tokens.ink)
            .monospacedDigit()
    }

    private func rankingStatusBadge(
        label: String,
        icon: String,
        tint: Color
    ) -> some View {
        Label(label, systemImage: icon)
            .font(.mMicro)
            .foregroundStyle(tint)
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 30)
            .background(Tokens.paper2, in: Capsule())
            .fixedSize(horizontal: false, vertical: true)
    }

    private func rankingPanel<Content: View>(
        accent: Color,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            Rectangle()
                .fill(accent)
                .frame(height: 3)
                .accessibilityHidden(true)
            content()
                .padding(.horizontal, Tokens.Space.s5)
            Spacer(minLength: 0)
        }
        .padding(.bottom, Tokens.Space.s5)
        .frame(maxWidth: .infinity, minHeight: 154, alignment: .leading)
        .background(Tokens.surface)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .strokeBorder(Tokens.line, lineWidth: 1))
    }

    // MARK: Match

    private func activeMatchSection(_ match: Snapshot.ActiveMatch) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            SectionRule(title: "진행 중인 자리 쟁탈전")

            ArenaArtBanner(
                imageName: "ArenaDuelBackdrop",
                eyebrow: "POSITION DUEL",
                title: "두 자리 중 하나만 남습니다",
                detail: "서버가 봉인한 문제와 개인 타이머로 승부가 결정됩니다.")

            statusDecisionRow(matchStatusPresentation(match))

            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Tokens.Space.s6) {
                    matchPosition(
                        label: "내 자리",
                        value: match.myPositionBefore)
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.title3.bold())
                        .foregroundStyle(Tokens.primary)
                        .accessibilityHidden(true)
                    matchPosition(
                        label: "상대 자리",
                        value: match.opponentPositionBefore)
                    Rectangle()
                        .fill(Tokens.line)
                        .frame(width: 1, height: 72)
                        .accessibilityHidden(true)
                    matchFacts(match)
                    Spacer(minLength: 0)
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    HStack(spacing: Tokens.Space.s5) {
                        matchPosition(label: "내 자리", value: match.myPositionBefore)
                        Image(systemName: "arrow.left.arrow.right")
                            .foregroundStyle(Tokens.primary)
                        matchPosition(label: "상대 자리", value: match.opponentPositionBefore)
                    }
                    DottedRule()
                    matchFacts(match)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Tokens.Space.s5)
            .background(Tokens.surface)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                    .strokeBorder(Tokens.line, lineWidth: 1))

            matchDeadlineSection(match)

            inlineNotice(
                icon: "arrow.right.circle.fill",
                title: matchNextActionTitle(match),
                detail: matchNextActionDetail(match),
                tint: match.status == "HELD" ? Tokens.warningInk
                    : (needsEvidenceSubmission(match) ? Tokens.warningInk
                        : (participantHasSubmitted(match) ? Tokens.successInk : Tokens.primary)),
                background: match.status == "HELD" ? Tokens.warningSoft
                    : (needsEvidenceSubmission(match) ? Tokens.warningSoft
                        : (participantHasSubmitted(match) ? Tokens.successSoft : Tokens.primarySoft)))

            if canPlay(match) {
                Button {
                    guard let matchId = match.id?.trimmingCharacters(in: .whitespacesAndNewlines),
                          !matchId.isEmpty else { return }
                    matchLaunch = MatchLaunch(id: matchId)
                } label: {
                    Label(
                        needsEvidenceSubmission(match)
                            ? "풀이 증거 제출하기"
                            : (match.attempt?.status == "IN_PROGRESS"
                                ? "경기 계속하기" : "경기 시작하기"),
                        systemImage: needsEvidenceSubmission(match)
                            ? "photo.badge.arrow.down"
                            : (match.attempt?.status == "IN_PROGRESS"
                                ? "arrow.right.circle.fill"
                                : "play.fill"))
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 340)
                .accessibilityHint("서버가 확정한 이 경기의 개인 문제 화면을 엽니다")
            }

            Text(matchSettlementRule(match))
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func pendingInvitationSection(
        _ invitation: Snapshot.PendingInvitation
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            SectionRule(title: "도착한 Ranked 초대")

            statusDecisionRow(
                .init(
                    icon: "envelope.badge",
                    title: "응답 대기",
                    detail: "수락 전에는 공식 경기가 만들어지지 않습니다.",
                    badge: "Ranked 초대",
                    tint: Tokens.arenaAccent,
                    background: Tokens.primarySoft
                )
            )

            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s6) {
                    matchFact(label: "초대자 티어", value: invitation.initiatorTier)
                    matchFact(label: "내 목표 티어", value: invitation.targetTier)
                    matchFact(label: "양측 예치", value: "각 \(invitation.stakeDays)일")
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    matchFact(label: "초대자 티어", value: invitation.initiatorTier)
                    matchFact(label: "내 목표 티어", value: invitation.targetTier)
                    matchFact(label: "양측 예치", value: "각 \(invitation.stakeDays)일")
                }
            }

            Text("수락하면 서버가 양쪽 자격과 잔액을 다시 확인한 뒤 같은 학습일수를 예치하고 공식 경기를 만듭니다.")
                .font(.mCaption)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s3) {
                    defenderAcceptButton(label: "초대 수락")
                    defenderDeclineButton(label: "초대 거절")
                }

                VStack(spacing: Tokens.Space.s3) {
                    defenderAcceptButton(label: "초대 수락")
                    defenderDeclineButton(label: "초대 거절")
                }
            }
        }
        .padding(Tokens.Space.s5)
        .background(Tokens.surface)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .strokeBorder(Tokens.line, lineWidth: 1)
        )
    }

    private func canPlay(_ match: Snapshot.ActiveMatch) -> Bool {
        guard let loadedContent,
              case .fresh = loadedContent.freshness else {
            // 저장된 과거 스냅샷은 상태 설명에만 사용한다. 시간이 흐르는 경기를
            // 시작·재개하는 권한으로 승격하지 않는다.
            return false
        }
        guard ["MATCHED", "READY", "IN_PROGRESS", "SUBMITTED"].contains(match.status),
              ["PENDING", "CLEAR"].contains(match.integrityState),
              let matchId = match.id?.trimmingCharacters(in: .whitespacesAndNewlines)
        else {
            return false
        }
        if let actions = match.availableActions {
            let playable = Set([
                "START", "SAVE_ANSWER", "ADVANCE", "SUBMIT", "SUBMIT_EVIDENCE",
            ])
            return !matchId.isEmpty && !playable.isDisjoint(with: Set(actions))
        }
        // 참가자 개인 제출은 공유 match가 아직 IN_PROGRESS여도 되돌릴 수 없다.
        // 구버전 서버처럼 attempt가 없을 때만 공유 상태 fallback을 허용한다.
        if let attempt = match.attempt {
            if ["EVIDENCE_REQUIRED", "SUBMITTED"].contains(attempt.status) {
                return needsEvidenceSubmission(match)
            }
            guard ["READY", "IN_PROGRESS"].contains(attempt.status) else { return false }
        }
        return !matchId.isEmpty && ["MATCHED", "READY", "IN_PROGRESS"].contains(match.status)
    }

    private func needsEvidenceSubmission(_ match: Snapshot.ActiveMatch) -> Bool {
        guard match.attempt?.evidenceRequired == true else { return false }
        guard let rawDeadline = match.attempt?.evidenceDeadlineAt,
              let deadline = isoDate(rawDeadline) else {
            return true
        }
        return deadline > Date()
    }

    private func participantHasSubmitted(_ match: Snapshot.ActiveMatch) -> Bool {
        match.attempt?.status == "SUBMITTED"
    }

    private var pendingDefenderCommandNotice: String {
        guard let pendingDefenderCommand else { return "" }
        switch pendingDefenderCommand.action {
        case .accept:
            return "이전에 보낸 수락 응답의 결과를 확인하지 못했습니다. 다른 응답을 보내지 않고 같은 수락 요청을 다시 확인합니다."
        case .decline:
            let reason = pendingDefenderCommand.reasonCode
                .map { declineReasonLabel($0) } ?? "선택한"
            return "이전에 보낸 \(reason) 거절 응답의 결과를 확인하지 못했습니다. 같은 사유와 같은 요청으로 다시 확인합니다."
        }
    }

    @ViewBuilder
    private func defenderPendingRetryButton(
        _ pending: GoatArenaPendingDefenderCommand
    ) -> some View {
        switch pending.action {
        case .accept:
            defenderAcceptButton(label: "수락 결과 다시 확인")
                .frame(maxWidth: 340)
        case .decline:
            defenderDeclineButton(label: "거절 결과 다시 확인")
                .frame(maxWidth: 340)
        }
    }

    private func defenderAcceptButton(label: String) -> some View {
        Button {
            confirmDefenderAccept = true
        } label: {
            defenderCommandButtonLabel(
                title: label,
                icon: "checkmark.circle.fill",
                action: .accept
            )
        }
        .buttonStyle(PrimaryButtonStyle())
        .frame(maxWidth: 340)
        .disabled(defenderCommandInFlight != nil || isRefreshing || !hasFreshSnapshot)
        .accessibilityHint("확인 후 이 자리 도전을 수락합니다")
    }

    private func defenderDeclineButton(label: String) -> some View {
        Button {
            confirmDefenderDecline = true
        } label: {
            defenderCommandButtonLabel(
                title: label,
                icon: "xmark.circle",
                action: .decline
            )
        }
        .buttonStyle(SecondaryButtonStyle())
        .frame(maxWidth: 340)
        .disabled(defenderCommandInFlight != nil || isRefreshing || !hasFreshSnapshot)
        .accessibilityHint("확인 후 고정된 사유 코드로 이 자리 도전을 거절합니다")
    }

    private func defenderCommandButtonLabel(
        title: String,
        icon: String,
        action: GoatArenaDefenderCommandAction
    ) -> some View {
        HStack(spacing: Tokens.Space.s2) {
            if defenderCommandInFlight == action {
                ProgressView()
                    .controlSize(.small)
            } else {
                Image(systemName: icon)
            }
            Text(title)
        }
        .frame(maxWidth: .infinity)
    }

    private func matchPosition(label: String, value: Int?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.mMicro)
                .foregroundStyle(Tokens.text2)
            Text(value.map { "#\($0)" } ?? "—")
                .font(.mStat)
                .foregroundStyle(Tokens.ink)
                .monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    private func matchFacts(_ match: Snapshot.ActiveMatch) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: Tokens.Space.s8) {
                matchFact(
                    label: "경기",
                    value: "\(matchTypeLabel(match.matchType)) · \(rankingLabel(match.activeRanking))")
                matchFact(
                    label: "내 역할",
                    value: roleLabel(match.role))
                matchFact(
                    label: "맡긴 일수",
                    value: match.stake.days.map {
                        "\($0)일 · \(stakeAssetLabel(match.stake.assetType))"
                    } ?? "서버 확인 중")
                matchFact(
                    label: "무결성",
                    value: integrityLabel(match.integrityState))
            }

            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                matchFact(
                    label: "경기",
                    value: "\(matchTypeLabel(match.matchType)) · \(rankingLabel(match.activeRanking))")
                matchFact(
                    label: "내 역할",
                    value: roleLabel(match.role))
                matchFact(
                    label: "맡긴 일수",
                    value: match.stake.days.map {
                        "\($0)일 · \(stakeAssetLabel(match.stake.assetType))"
                    } ?? "서버 확인 중")
                matchFact(
                    label: "무결성",
                    value: integrityLabel(match.integrityState))
            }
        }
    }

    private func matchFact(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.mMicro)
                .foregroundStyle(Tokens.text2)
            Text(value)
                .font(.mCaption)
                .foregroundStyle(Tokens.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func matchDeadlineSection(_ match: Snapshot.ActiveMatch) -> some View {
        let participantEndsAt = match.attempt?.endsAt
        let submissionDeadline = participantEndsAt ?? match.submitsBy
        if match.startsBy != nil || submissionDeadline != nil
            || match.attempt?.submittedAt != nil
            || match.attempt?.evidenceDeadlineAt != nil {
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                Text("서버 기준 마감")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.primary)

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: Tokens.Space.s6) {
                        if let starts = shortDateTime(match.startsBy) {
                            matchDeadline(
                                icon: "play.circle",
                                label: "시작 마감",
                                value: starts,
                                emphasized: ["MATCHED", "READY"].contains(match.status))
                        }
                        if let submits = shortDateTime(submissionDeadline) {
                            matchDeadline(
                                icon: "paperplane.circle",
                                label: participantEndsAt == nil ? "공통 제출 마감" : "내 제출 마감",
                                value: submits,
                                emphasized: match.status == "IN_PROGRESS"
                                    && !participantHasSubmitted(match))
                        }
                        if let submitted = shortDateTime(match.attempt?.submittedAt) {
                            matchDeadline(
                                icon: "checkmark.circle",
                                label: "내 답안 접수",
                                value: submitted,
                                emphasized: false)
                        }
                        if let evidence = shortDateTime(match.attempt?.evidenceDeadlineAt),
                           match.attempt?.evidenceRequired == true {
                            matchDeadline(
                                icon: "doc.viewfinder",
                                label: "풀이 사진 마감",
                                value: evidence,
                                emphasized: true)
                        }
                    }

                    VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                        if let starts = shortDateTime(match.startsBy) {
                            matchDeadline(
                                icon: "play.circle",
                                label: "시작 마감",
                                value: starts,
                                emphasized: ["MATCHED", "READY"].contains(match.status))
                        }
                        if let submits = shortDateTime(submissionDeadline) {
                            matchDeadline(
                                icon: "paperplane.circle",
                                label: participantEndsAt == nil ? "공통 제출 마감" : "내 제출 마감",
                                value: submits,
                                emphasized: match.status == "IN_PROGRESS"
                                    && !participantHasSubmitted(match))
                        }
                        if let submitted = shortDateTime(match.attempt?.submittedAt) {
                            matchDeadline(
                                icon: "checkmark.circle",
                                label: "내 답안 접수",
                                value: submitted,
                                emphasized: false)
                        }
                        if let evidence = shortDateTime(match.attempt?.evidenceDeadlineAt),
                           match.attempt?.evidenceRequired == true {
                            matchDeadline(
                                icon: "doc.viewfinder",
                                label: "풀이 사진 마감",
                                value: evidence,
                                emphasized: true)
                        }
                    }
                }
            }
        }
    }

    private func matchDeadline(
        icon: String,
        label: String,
        value: String,
        emphasized: Bool
    ) -> some View {
        HStack(spacing: Tokens.Space.s2) {
            Image(systemName: icon)
                .foregroundStyle(emphasized ? Tokens.warningInk : Tokens.text2)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(label)
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text2)
                Text(value)
                    .font(.mCaption)
                    .foregroundStyle(emphasized ? Tokens.warningInk : Tokens.ink)
                    .monospacedDigit()
            }
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: Defender response

    @MainActor
    private func createUnrankedMatch() async {
        guard !isCreatingSubMatch,
              ServerAPI.hasToken,
              let loadedContent,
              case .fresh = loadedContent.freshness,
              loadedContent.snapshot.activeMatch == nil,
              let ownerSlot = loadedAccountSlot,
              ownerSlot == DataScope.slot else { return }
        let commandID = subMatchCommandId
        isCreatingSubMatch = true
        do {
            let response = try await ServerAPI.createUnrankedArenaMatch(
                commandId: commandID,
                clientBuildVersion: ServerAPI.clientBuildVersion
            )
            guard DataScope.slot == ownerSlot,
                  loadedAccountSlot == ownerSlot,
                  subMatchCommandId == commandID else { return }
            let matchId = response.match.id.trimmingCharacters(
                in: .whitespacesAndNewlines
            )
            guard !matchId.isEmpty else {
                throw ServerAPIError(
                    message: "생성된 경기 번호를 확인할 수 없습니다.",
                    code: "GOAT_ARENA_MATCH_CREATE_INVALID"
                )
            }
            subMatchCommandId = UUID().uuidString
            matchLaunch = MatchLaunch(id: matchId)
        } catch {
            guard DataScope.slot == ownerSlot,
                  loadedAccountSlot == ownerSlot,
                  subMatchCommandId == commandID else { return }
            if let apiError = error as? ServerAPIError {
                subMatchCreateError = ArenaDisplayTerms.apply(
                    apiError.message ?? "서버가 상대 찾기 결과를 확인하지 못했습니다."
                )
            } else if error is URLError {
                subMatchCreateError = "네트워크 연결을 확인하지 못했습니다. 같은 버튼을 누르면 동일 요청으로 안전하게 다시 확인합니다."
            } else {
                subMatchCreateError = "상대 찾기 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
            }
        }
        guard DataScope.slot == ownerSlot,
              loadedAccountSlot == ownerSlot,
              subMatchCommandId == commandID || matchLaunch != nil else { return }
        isCreatingSubMatch = false
    }

    @MainActor
    private func respondToDefenderChallenge(
        action: GoatArenaDefenderCommandAction,
        reasonCode: ServerAPI.GoatArenaDeclineReasonCode? = nil
    ) async {
        guard defenderCommandInFlight == nil,
              let loadedContent,
              case .fresh = loadedContent.freshness,
              let accountSlot = loadedAccountSlot,
              accountSlot == DataScope.slot
        else {
            return
        }

        let snapshot = loadedContent.snapshot
        guard let invitation = snapshot.pendingInvitation else {
            return
        }
        let matchId = invitation.id.trimmingCharacters(
            in: .whitespacesAndNewlines
        )
        guard !matchId.isEmpty else { return }

        if action == .decline, reasonCode == nil {
            defenderCommandError = "거절 사유를 선택한 뒤 다시 시도해 주세요."
            defenderCommandErrorIsAuthExpired = false   // 직전 401 표식이 남지 않게
            return
        }

        defenderCommandInFlight = action
        defer { defenderCommandInFlight = nil }

        do {
            let prepared = try GoatArenaDefenderCommandStore.prepare(
                matchId: matchId,
                action: action,
                reasonCode: reasonCode
            )
            pendingDefenderCommand = prepared.pending

            let response: ServerAPI.GoatArenaMatchCommandResponse
            switch action {
            case .accept:
                response = try await ServerAPI.acceptGoatArenaChallenge(
                    matchId: matchId,
                    commandId: prepared.keys.acceptCommandId,
                    clientBuildVersion: prepared.keys.clientBuildVersion
                )
            case .decline:
                guard let reasonCode else {
                    throw GoatArenaDefenderCommandError.invalidDeclineReason
                }
                response = try await ServerAPI.declineGoatArenaChallenge(
                    matchId: matchId,
                    reasonCode: reasonCode,
                    commandId: prepared.keys.declineCommandId,
                    clientBuildVersion: prepared.keys.clientBuildVersion
                )
            }

            guard DataScope.slot == accountSlot,
                  loadedAccountSlot == accountSlot else {
                throw GoatArenaDefenderCommandError.accountChanged
            }

            let expectedStatus = action == .accept ? "READY" : "CANCELLED"
            guard (response.invitationId ?? response.match.id) == matchId,
                  response.match.status == expectedStatus,
                  !response.match.integrityState.isEmpty else {
                throw GoatArenaDefenderCommandError.invalidResponse
            }

            defenderCommandReceipt = response.match
            try? GoatArenaDefenderCommandStore.clear(matchId: matchId)
            pendingDefenderCommand = nil

            // 명령 응답만으로 경기 전체 읽기 모델을 추측하지 않는다. 성공 영수증을
            // 먼저 고정한 뒤 서버 스냅샷 전체를 다시 받아 화면을 전환한다.
            await load()
        } catch {
            guard DataScope.slot == accountSlot,
                  loadedAccountSlot == accountSlot else {
                return
            }
            defenderCommandError = defenderCommandErrorMessage(
                error,
                action: action
            )
            // 401 만 재로그인 버튼 대상 — 문구(defenderCommandErrorMessage 2140행
            // 부근)와 같은 판정 기준을 쓴다.
            defenderCommandErrorIsAuthExpired =
                (error as? ServerAPIError)?.statusCode == 401

            if let apiError = error as? ServerAPIError,
               [404, 409].contains(apiError.statusCode ?? -1) {
                await load()
            }
        }
    }

    private func defenderCommandErrorMessage(
        _ error: Error,
        action: GoatArenaDefenderCommandAction
    ) -> String {
        if error is CancellationError {
            return "요청이 중단되었습니다. 같은 버튼을 누르면 저장된 동일 요청으로 다시 확인합니다."
        }

        if let commandError = error as? GoatArenaDefenderCommandError {
            switch commandError {
            case .conflictingPending:
                return "직전에 보낸 경기 응답의 결과를 먼저 확인해야 합니다. 화면에 표시된 ‘결과 다시 확인’ 버튼을 사용해 주세요."
            case .persistenceFailed:
                return "안전한 재시도 정보를 이 iPad에 저장하지 못해 요청을 보내지 않았습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요."
            case .invalidDeclineReason:
                return "거절 사유를 확인할 수 없습니다. 화면에서 사유를 다시 선택해 주세요."
            case .invalidResponse:
                return "서버 응답 형식을 확인하지 못했습니다. 경기 상태를 새로고침한 뒤 다시 시도해 주세요."
            case .accountChanged:
                return "로그인 계정이 변경되어 요청을 중단했습니다."
            }
        }

        if let apiError = error as? ServerAPIError {
            if apiError.statusCode == 401 {
                return "로그인 시간이 만료되었습니다. 다시 로그인한 뒤 경기 상태를 확인해 주세요."
            }
            if apiError.statusCode == 404 {
                return "현재 계정에서 응답 가능한 도전을 찾을 수 없습니다. 최신 경기 상태를 확인해 주세요."
            }
            if apiError.statusCode == 409 {
                return "경기 상태가 이미 바뀌었습니다. 서버의 최신 상태를 다시 불러왔습니다."
            }
            if apiError.code == "GOAT_ARENA_DECLINE_REASON_INVALID" {
                return "지원되는 거절 사유가 아닙니다. 앱을 업데이트한 뒤 다시 시도해 주세요."
            }
            if apiError.code == "GOAT_ARENA_COMMAND_HEADER_REQUIRED"
                || apiError.code == "GOAT_ARENA_VERSION_MISMATCH" {
                return "앱과 서버 버전이 맞지 않습니다. 앱을 업데이트한 뒤 다시 시도해 주세요."
            }
        }

        if error is URLError {
            return action == .accept
                ? "수락 결과를 확인하지 못했습니다. 같은 수락 버튼을 누르면 동일 요청으로 안전하게 다시 확인합니다."
                : "거절 결과를 확인하지 못했습니다. 같은 거절 사유와 동일 요청으로 안전하게 다시 확인합니다."
        }

        return "경기 응답 결과를 확인하지 못했습니다. 화면에 표시된 같은 응답으로 다시 확인해 주세요."
    }

    private func declineReasonLabel(
        _ reason: ServerAPI.GoatArenaDeclineReasonCode
    ) -> String {
        switch reason {
        case .scheduleConflict:
            return "일정이 맞지 않음"
        case .technicalIssue:
            return "기술 문제"
        case .other:
            return "기타 사유"
        }
    }

    @MainActor
    private func reconcileDefenderCommandState(
        snapshot: Snapshot,
        accountSlot: String,
        authoritative: Bool
    ) {
        guard accountSlot == DataScope.slot else {
            pendingDefenderCommand = nil
            return
        }

        if let invitation = snapshot.pendingInvitation {
            let invitationId = invitation.id.trimmingCharacters(
                in: .whitespacesAndNewlines
            )
            pendingDefenderCommand = invitationId.isEmpty
                ? nil
                : (try? GoatArenaDefenderCommandStore.load(
                    matchId: invitationId
                ))?.pending
            return
        }
        // 이미 만들어진 ArenaMatch는 자동 배정/수락 완료 경기다. 해당 match id를
        // MainInvitationOffer id로 재사용하지 않는다.
        pendingDefenderCommand = nil
    }

    // MARK: Notices and labels

    private func truthNotice(_ snapshot: Snapshot) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            DottedRule()
            HStack(alignment: .top, spacing: Tokens.Space.s3) {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(Tokens.primary)
                    .padding(.top, 1)
                    .accessibilityHidden(true)
                Text(truthNoticeText(snapshot))
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func inlineNotice(
        icon: String,
        title: String,
        detail: String,
        tint: Color,
        background: Color
    ) -> some View {
        HStack(alignment: .top, spacing: Tokens.Space.s3) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .padding(.top, 2)
                .frame(width: 24)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.mBodyB)
                    .foregroundStyle(Tokens.ink)
                Text(detail)
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(Tokens.Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
        .accessibilityElement(children: .combine)
    }

    private func identityDetail(_ snapshot: Snapshot) -> String {
        let school = snapshot.identity.schoolName?.trimmingCharacters(in: .whitespacesAndNewlines)
        return school?.isEmpty == false ? school! : "학교 비공개"
    }

    private func phaseLabel(_ cycle: Snapshot.Cycle) -> String {
        switch cycle.phase {
        case "PAID_ACCESS":
            return "유료 이용"
        case "COMPLETION_PASS":
            return cycle.access.completionPassActive ? "Completion Pass" : "Day 30 심사"
        case "REVIEW_OR_CLOSED":
            return "심사·정산"
        case "UPCOMING":
            return "시작 대기"
        default:
            return "상태 확인"
        }
    }

    private func phaseColor(_ cycle: Snapshot.Cycle) -> Color {
        switch cycle.phase {
        case "PAID_ACCESS":
            return Tokens.brandCyan
        case "COMPLETION_PASS":
            return Color(hex: 0xFFD66B)
        default:
            return onNavy.opacity(0.68)
        }
    }

    private func cycleFootnote(_ cycle: Snapshot.Cycle) -> String {
        if cycle.phase == "COMPLETION_PASS" {
            return cycle.access.completionPassActive
                ? "Day 30은 일반 유료 이용일이 아닙니다. 허용된 활동만 Completion Pass로 인정됩니다."
                : "Day 30 Completion Pass의 허용 시간과 활동을 서버에서 확인하고 있습니다."
        }
        if cycle.phase == "PAID_ACCESS" {
            let cutoff = cycle.challenges.newRequestCutoffDay.map(String.init) ?? "28"
            return "유료 학습은 Day 1–29에 열립니다. 새로운 Unranked 도전 요청은 Day \(cutoff)까지만 가능합니다."
        }
        return "사이클 상태와 이용 권리는 서버 시각을 기준으로 판정됩니다."
    }

    private func rankingLifecyclePresentation(_ snapshot: Snapshot) -> DecisionPresentation {
        let pool = rankingLabel(snapshot.ranking.activeRanking)
        switch snapshot.ranking.seat.status {
        case "ACTIVE":
            return DecisionPresentation(
                icon: "eye.fill",
                title: "\(pool) 자리가 공개되어 있습니다",
                detail: "현재 Arena Position은 주간 시드의 자리이며, MMR 변화만으로 즉시 움직이지 않습니다.",
                badge: "ACTIVE",
                tint: Tokens.successInk,
                background: Tokens.successSoft)
        case "HIDDEN":
            return DecisionPresentation(
                icon: "eye.slash.fill",
                title: "\(pool) 자리가 일시 숨김 상태입니다",
                detail: "무결성 확인 중에는 공개 순위에서 보이지 않지만 마지막 시드와 원장은 서버에 보존됩니다.",
                badge: "HIDDEN",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        case "SETTLING":
            return DecisionPresentation(
                icon: "arrow.triangle.2.circlepath",
                title: "\(pool) 자리 정산이 진행 중입니다",
                detail: "경기 결과와 일수 원장이 함께 확정될 때까지 자리 숫자를 최종 결과로 보지 마세요.",
                badge: "SETTLING",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        case "CLOSED":
            return DecisionPresentation(
                icon: "lock.fill",
                title: "이번 Arena 자리가 종료되었습니다",
                detail: "종료된 시즌의 자리는 더 이상 이동하지 않습니다. MMR은 별도 실력 기록으로 계속 보존됩니다.",
                badge: "CLOSED",
                tint: Tokens.text2,
                background: Tokens.paper2)
        case "PLACEMENT_PENDING", "NOT_SEEDED":
            return DecisionPresentation(
                icon: "list.number",
                title: "Arena 자리 배치를 기다리고 있습니다",
                detail: snapshot.ranking.skill.status == "PLACEMENT_PENDING"
                    ? "배치고사를 마치면 첫 MMR이 발급되고, 주간 시드 뒤 Arena Position이 별도로 배정됩니다."
                    : "MMR은 준비되어 있습니다. 다음 유효 주간 시드가 끝나면 Arena Position이 별도로 배정됩니다.",
                badge: "PLACEMENT",
                tint: Tokens.primary,
                background: Tokens.primarySoft)
        default:
            return DecisionPresentation(
                icon: "questionmark.circle.fill",
                title: "Arena 자리 상태를 확인하고 있습니다",
                detail: "알 수 없는 상태를 임의의 순위로 바꾸지 않고 서버 갱신을 기다립니다.",
                badge: "확인 중",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }
    }

    private func rankingLabel(_ value: String?) -> String {
        switch value?.uppercased() {
        case "SUB", "MAIN": return ArenaDisplayTerms.ranking(value)
        default: return "미지정"
        }
    }

    private func tierLabel(_ value: String?) -> String {
        switch value?.uppercased() {
        case "BRONZE": return "브론즈"
        case "SILVER": return "실버"
        case "GOLD": return "골드"
        case "PLATINUM": return "플래티넘"
        case "EMERALD": return "에메랄드"
        case "DIAMOND": return "다이아몬드"
        case "MASTER": return "마스터"
        case "GRANDMASTER": return "그랜드마스터"
        case "CHALLENGER": return "챌린저"
        default: return "티어 미발급"
        }
    }

    private func skillStatusLabel(_ value: String) -> String {
        switch value {
        case "PLACEMENT_PENDING": return "MMR 배치 대기"
        case "PROVISIONAL": return "잠정 MMR"
        case "CONFIRMED": return "확정 MMR"
        default: return "MMR 상태 확인"
        }
    }

    private func skillStatusIcon(_ value: String) -> String {
        switch value {
        case "PLACEMENT_PENDING": return "list.number"
        case "PROVISIONAL": return "clock.fill"
        case "CONFIRMED": return "checkmark.seal.fill"
        default: return "questionmark.circle.fill"
        }
    }

    private func skillStatusTint(_ value: String) -> Color {
        switch value {
        case "CONFIRMED": return Tokens.successInk
        case "PROVISIONAL": return Tokens.warningInk
        default: return Tokens.primary
        }
    }

    private func seatStatusLabel(_ value: String) -> String {
        switch value {
        case "PLACEMENT_PENDING", "NOT_SEEDED": return "자리 배치 대기"
        case "ACTIVE": return "자리 공개"
        case "HIDDEN": return "자리 숨김"
        case "SETTLING": return "자리 정산 중"
        case "CLOSED": return "자리 종료"
        default: return "자리 상태 확인"
        }
    }

    private func seatStatusIcon(_ value: String) -> String {
        switch value {
        case "PLACEMENT_PENDING", "NOT_SEEDED": return "list.number"
        case "ACTIVE": return "eye.fill"
        case "HIDDEN": return "eye.slash.fill"
        case "SETTLING": return "arrow.triangle.2.circlepath"
        case "CLOSED": return "lock.fill"
        default: return "questionmark.circle.fill"
        }
    }

    private func seatStatusTint(_ value: String) -> Color {
        switch value {
        case "ACTIVE": return Tokens.successInk
        case "HIDDEN": return Tokens.warningInk
        case "SETTLING", "PLACEMENT_PENDING", "NOT_SEEDED": return Tokens.primary
        default: return Tokens.text2
        }
    }

    private func skillStatusDetail(_ skill: Snapshot.Ranking.Skill) -> String {
        if skill.status == "PLACEMENT_PENDING" {
            return "배치고사를 완료하면 첫 MMR이 발급됩니다."
        }
        if skill.status == "PROVISIONAL" {
            let left = skill.weeklyExamsUntilConfirmed ?? 0
            return left > 0
                ? "잠정 MMR · 공식 시험 \(left)회 뒤 확정"
                : "잠정 MMR · 다음 주간 확정 대기"
        }
        if let rank = skill.overallRank {
            return "전체 MMR \(rank)위 · 시험 성과로 갱신"
        }
        return "시험 성과로 갱신되는 실력 지표"
    }

    private func seatStatusDetail(_ seat: Snapshot.Ranking.Seat) -> String {
        if seat.status == "ACTIVE", seat.arenaPosition != nil {
            if let week = seat.seedWeekKey {
                return "\(week) 시드 · 직접 대결로만 이동"
            }
            return "직접 대결로만 이동하는 자리"
        }
        if seat.status == "HIDDEN" {
            return "무결성 확인 중 · 공개 좌석에서 일시 숨김"
        }
        if seat.status == "SETTLING" {
            return "경기 결과를 안전하게 정산하는 중"
        }
        if seat.status == "CLOSED" {
            return "이번 시즌의 Arena 자리는 종료됨 · MMR은 별도 보존"
        }
        if ["PLACEMENT_PENDING", "NOT_SEEDED"].contains(seat.status) {
            return "주간 시드가 끝나면 Arena 자리가 배정됩니다."
        }
        return "알 수 없는 자리를 임의로 표시하지 않고 서버 확인 중"
    }

    private func conditionTitle(_ key: String) -> String {
        switch key {
        case "CYCLE_ATTENDANCE":
            return "30일 사이클 출석"
        case "REFUND_DAY_BALANCE":
            return "페이백 점수 기준 달성"
        case "COMPLETED_SUB_CHALLENGES":
            return "완료한 Unranked 직접 대결"
        default:
            return "서버 판정 조건"
        }
    }

    private func conditionDetail(_ condition: Snapshot.Payback.Condition) -> String {
        switch condition.key {
        case "CYCLE_ATTENDANCE":
            return "유효 학습 이벤트가 인정된 날만 누적"
        case "REFUND_DAY_BALANCE":
            return "잠긴 점수와 학습 가능 일수는 합산하지 않음"
        case "COMPLETED_SUB_CHALLENGES":
            return "일반·Revenge 중 완료로 인정된 경기"
        default:
            return "서버 원장 기준"
        }
    }

    private func conditionCount(_ condition: Snapshot.Payback.Condition) -> String {
        guard let required = condition.required else {
            return "\(condition.current) · 기준 확인 중"
        }
        let unit = condition.key == "COMPLETED_SUB_CHALLENGES" ? "회" : "일"
        return "\(condition.current)/\(required)\(unit)"
    }

    private func conditionRatio(_ condition: Snapshot.Payback.Condition) -> CGFloat {
        guard let required = condition.required, required > 0 else { return 0 }
        return CGFloat(min(max(Double(condition.current) / Double(required), 0), 1))
    }

    private func paybackPresentation(
        _ payback: Snapshot.Payback
    ) -> (label: String, color: Color, background: Color) {
        switch payback.refundStatus {
        case "COMPLETED":
            return ("지급 완료", Tokens.successInk, Tokens.successSoft)
        case "PAYOUT_REQUESTED", "PAYOUT_PROCESSING":
            return ("지급 처리 중", Tokens.primary, Tokens.primarySoft)
        case "HELD":
            return ("지급 보류", Tokens.warningInk, Tokens.warningSoft)
        case "FAILED":
            return ("지급 확인 필요", Tokens.warningInk, Tokens.warningSoft)
        default:
            break
        }
        if payback.state == "ELIGIBLE" {
            return ("조건 충족", Tokens.successInk, Tokens.successSoft)
        }
        if payback.state == "POLICY_PENDING" {
            return ("판정 대기", Tokens.warningInk, Tokens.warningSoft)
        }
        return ("진행 중", Tokens.primary, Tokens.primarySoft)
    }

    private func matchTypeLabel(_ value: String) -> String {
        value == "REVENGE" ? "Revenge" : "일반 도전"
    }

    private func roleLabel(_ value: String) -> String {
        value == "CHALLENGER" ? "도전자" : "방어자"
    }

    private func matchStatusLabel(_ value: String) -> String {
        switch value {
        case "REQUESTED": return "매칭 대기"
        case "MATCHED": return "매칭 완료"
        case "READY": return "시작 대기"
        case "IN_PROGRESS": return "진행 중"
        case "SUBMITTED": return "채점 중"
        case "HELD": return "무결성 확인 중"
        case "RESOLVED": return "정산 대기"
        default: return "상태 확인"
        }
    }

    private func matchStatusPresentation(_ match: Snapshot.ActiveMatch) -> DecisionPresentation {
        if needsEvidenceSubmission(match) {
            return DecisionPresentation(
                icon: "doc.viewfinder.fill",
                title: "풀이 증거 제출 필요",
                detail: "답안은 서버에 고정되었습니다. 경기 계속하기에서 서버 마감 전 풀이 사진 1~5장을 제출해 주세요.",
                badge: "사진 제출",
                tint: Tokens.warningInk,
                background: Tokens.warningSoft)
        }
        if participantHasSubmitted(match) {
            return DecisionPresentation(
                icon: "checkmark.circle.fill",
                title: "내 답안 제출 완료",
                detail: "내 답안은 서버에 고정되었습니다. 공유 경기가 진행 중이어도 다시 시작하거나 수정하지 않고 상대 제출과 채점 결과를 기다립니다.",
                badge: "제출 완료",
                tint: Tokens.successInk,
                background: Tokens.successSoft)
        }

        let detail: String
        let icon: String
        let tint: Color
        let background: Color

        switch match.status {
        case "REQUESTED":
            detail = "대결 요청이 서버에 기록되었습니다. 상대 확정 전까지 맡긴 일수와 요청 상태를 확인합니다."
            icon = "hourglass"
            tint = Tokens.primary
            background = Tokens.primarySoft
        case "MATCHED":
            detail = match.role == "DEFENDER"
                ? "내가 방어자인 도전입니다. 서버의 최신 상태에서 수락하거나 고정 사유 코드로 거절할 수 있습니다."
                : "상대와 두 자리, 맡긴 일수가 고정되었습니다. 방어자의 응답을 기다리고 있습니다."
            icon = "person.2.fill"
            tint = Tokens.primary
            background = Tokens.primarySoft
        case "READY":
            detail = "경기 시작 구간입니다. 아래 버튼에서 내 개인 제한 시간이 시작됩니다."
            icon = "play.circle.fill"
            tint = Tokens.warningInk
            background = Tokens.warningSoft
        case "IN_PROGRESS":
            detail = "내 개인 제한 시간이 진행 중입니다. 아래 버튼에서 이어서 풀고 제출할 수 있습니다."
            icon = "bolt.fill"
            tint = Tokens.primary
            background = Tokens.primarySoft
        case "SUBMITTED":
            detail = "답안 제출이 기록되었습니다. 동일한 채점 기준으로 두 결과를 비교하고 있습니다."
            icon = "checkmark.circle.fill"
            tint = Tokens.successInk
            background = Tokens.successSoft
        case "HELD":
            detail = "자동 정산을 멈추고 무결성을 확인하고 있습니다. 자리와 맡긴 일수는 그대로 잠겨 있습니다."
            icon = "exclamationmark.shield.fill"
            tint = Tokens.warningInk
            background = Tokens.warningSoft
        case "RESOLVED":
            detail = "경기 결과는 결정되었고, 자리 교환과 일수 원장을 한 번에 확정하는 중입니다."
            icon = "arrow.triangle.2.circlepath"
            tint = Tokens.primary
            background = Tokens.primarySoft
        default:
            detail = "알 수 없는 경기 상태를 임의로 해석하지 않고 서버 갱신을 기다립니다."
            icon = "questionmark.circle.fill"
            tint = Tokens.warningInk
            background = Tokens.warningSoft
        }

        return DecisionPresentation(
            icon: icon,
            title: matchStatusLabel(match.status),
            detail: detail,
            badge: matchStatusLabel(match.status),
            tint: tint,
            background: background)
    }

    private func matchNextActionTitle(_ match: Snapshot.ActiveMatch) -> String {
        if needsEvidenceSubmission(match) {
            return "풀이 사진을 제출해 주세요"
        }
        if participantHasSubmitted(match) {
            return "상대 제출과 채점 결과를 기다리세요"
        }
        if match.role == "DEFENDER", match.status == "MATCHED" {
            return "자리 도전에 응답해 주세요"
        }
        switch match.status {
        case "REQUESTED": return "상대 확정을 기다리세요"
        case "MATCHED": return "시작 마감을 확인하세요"
        case "READY": return "현재 경기 경로에서 시작하세요"
        case "IN_PROGRESS": return "제출 마감을 놓치지 마세요"
        case "SUBMITTED": return "채점 결과를 기다리세요"
        case "HELD": return "무결성 검토 결과를 기다리세요"
        case "RESOLVED": return "원장 정산 완료를 기다리세요"
        default: return "서버 상태를 다시 확인하세요"
        }
    }

    private func matchNextActionDetail(_ match: Snapshot.ActiveMatch) -> String {
        if needsEvidenceSubmission(match) {
            let deadline = shortDateTime(match.attempt?.evidenceDeadlineAt)
                .map { " 서버 제출 마감은 \($0)입니다." } ?? ""
            return "답안은 이미 고정되어 다시 바꿀 수 없습니다. 아래 경기 계속하기에서 풀이 사진 1~5장을 제출하세요.\(deadline)"
        }
        if participantHasSubmitted(match) {
            return "제출된 답안은 바꿀 수 없습니다. 서버 정산이 끝나면 이 화면의 경기 상태와 Arena Position이 갱신됩니다."
        }
        if match.role == "DEFENDER", match.status == "MATCHED" {
            let deadline = shortDateTime(match.startsBy)
                .map { " 서버 시작 마감은 \($0)입니다." } ?? ""
            return "위 응답 영역에서 수락 또는 거절을 확인하세요. 저장된 과거 화면에서는 응답 버튼이 열리지 않습니다.\(deadline)"
        }
        switch match.status {
        case "REQUESTED":
            return "상대가 확정되면 자리와 마감이 이 화면에 표시됩니다."
        case "MATCHED":
            let deadline = shortDateTime(match.startsBy).map { " 시작 마감은 \($0)입니다." } ?? ""
            return "서버가 문제와 시작 조건을 준비하고 있습니다.\(deadline)"
        case "READY":
            let deadline = shortDateTime(match.startsBy).map { " 시작 마감은 \($0)입니다." } ?? ""
            return "아래 경기 시작 버튼을 누르면 내 개인 제한 시간이 시작됩니다.\(deadline)"
        case "IN_PROGRESS":
            let deadline = shortDateTime(match.submitsBy).map { " 제출 마감은 \($0)입니다." } ?? ""
            return "아래 경기 계속하기 버튼에서 답안을 이어서 저장하고 제출하세요.\(deadline)"
        case "SUBMITTED":
            return "채점 중에는 자리를 최종 결과로 보지 마세요. 결과가 확정되면 정산 단계로 이동합니다."
        case "HELD":
            return "검토 중에는 자리와 맡긴 일수가 움직이지 않습니다. 앱이 승패나 정산 결과를 추측하지 않습니다."
        case "RESOLVED":
            return "자리와 일수 원장이 함께 확정되면 Arena Position과 사용 가능 일수가 갱신됩니다."
        default:
            return "잠시 후 새로고침해 서버가 내려준 상태를 다시 확인하세요."
        }
    }

    private func matchSettlementRule(_ match: Snapshot.ActiveMatch) -> String {
        if let serverRule = match.settlementRule?.trimmingCharacters(in: .whitespacesAndNewlines),
           !serverRule.isEmpty {
            return ArenaDisplayTerms.apply(serverRule)
        }
        if match.matchType == "REVENGE" {
            if match.activeRanking == "MAIN" {
                return "Ranked 복수전 정산 · 정상 완료에서 1일을 수수료로 소각합니다. 공격자가 이기면 Arena 상태를 교환하고 2×S-1일을 공격자에게 반환하며, 방어자가 이기면 Arena 상태를 유지하고 2×S-1일을 방어자에게 이전합니다. 방어자만 24시간 안에 미완료하면 2×S-1일을 공격자에게 반환하고 1일을 소각하며, 공격자만 미완료하면 2×S-1일을 방어자에게 이전하고 1일을 소각합니다. 양측 모두 미완료하면 예치 전부를 소각합니다."
            }
            return "Unranked 복수전 정산 · 정상 완료에서 도전자가 이기면 Arena 상태를 교환하고 예치한 페이백 점수 2점을 전부 소각합니다. 방어자가 이기면 Arena 상태를 유지하고 1점을 방어자에게 이전하며 1점을 소각합니다. 방어자만 24시간 안에 미완료하면 1점을 도전자에게 반환하고 1점을 소각하며, 도전자만 미완료하면 1점을 방어자에게 이전하고 1점을 소각합니다. 양측 모두 미완료하면 예치한 2점을 전부 소각합니다."
        }
        if match.activeRanking == "MAIN" {
            return "Ranked 일반전 정산 · 상향 쟁탈전은 공격자만 예치하고, 수락형 하위 티어 초대전은 양쪽이 같은 일수를 예치합니다. 정상 완료 시 승자는 자기 예치금을 돌려받고 상대가 예치한 금액이 있으면 이전받습니다. 공격자가 이기면 Arena 상태를 교환하고 방어자가 이기면 유지합니다."
        }
        return "Unranked 일반 쟁탈전 정산 · 도전자가 이기면 경기 시작 전 티어가 브론즈일 때 예치한 페이백 점수 1점을 반환받고, 실버 이상일 때는 1점을 소각하며 Arena 상태를 교환합니다. 방어자가 이기면 그 1점을 방어자에게 이전하고 Arena 상태를 유지합니다."
    }

    private func stakeAssetLabel(_ value: String?) -> String {
        switch value {
        case "PAYBACK_SCORE_DAY", "REFUND_CHALLENGE_DAY": return "페이백 점수"
        case "LEARNING_DAY", "BONUS_ACCESS_DAY": return "학습 가능 일수"
        default: return "자산 확인 중"
        }
    }

    private func integrityLabel(_ value: String) -> String {
        switch value {
        case "CLEAR": return "이상 없음"
        case "HELD", "REVIEW", "FLAGGED": return "검토 중"
        default: return "상태 확인"
        }
    }

    private func shortDateTime(_ value: String?) -> String? {
        guard let value else { return nil }
        guard let date = isoDate(value) else { return nil }
        return date.formatted(
            Date.FormatStyle(date: .abbreviated, time: .shortened)
                .locale(Locale(identifier: "ko_KR")))
    }

    private func isoDate(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }

    private func relativeTime(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.unitsStyle = .full
        let now = Date()
        return formatter.localizedString(for: min(date, now), relativeTo: now)
    }

    private func truthNoticeText(_ snapshot: Snapshot) -> String {
        if snapshot.capabilities.challengeCommands == "NOT_AVAILABLE" {
            if snapshot.pendingInvitation != nil {
                return "새 상대를 찾기 전에 먼저 도착한 Ranked 초대에 응답하세요."
            }
            if let match = snapshot.activeMatch, canPlay(match) {
                return "진행 중인 경기를 이 iPad에서 바로 시작하거나 이어서 제출하세요. 경기가 끝나면 새 상대 찾기가 다시 열립니다."
            }
            return "내 Arena 기록은 최신 서버 상태와 동기화됩니다. 새 상대 찾기는 화면의 ‘상대 찾기’ 버튼에서 이어갈 수 있습니다."
        }
        if let generatedAt = isoDate(snapshot.generatedAt) {
            return "공식 시험·경기 기록 기준 · \(relativeTime(generatedAt)) 갱신"
        }
        return "공식 시험·경기 기록을 기준으로 갱신됩니다."
    }

    private func formatted(_ value: Int) -> String {
        value.formatted(.number.grouping(.automatic))
    }

    // MARK: Loading

    @MainActor
    private func load() async {
        let nextID = UUID()
        let accountSlot = DataScope.slot
        requestID = nextID
        let existing = loadedContent
        let existingAccountSlot = loadedAccountSlot
        if existing == nil {
            state = .loading
        } else {
            isRefreshing = true
        }

        guard ServerAPI.hasToken else {
            isRefreshing = false
            state = .signedOut
            loadedAccountSlot = nil
            pendingDefenderCommand = nil
            defenderCommandReceipt = nil
            return
        }

        do {
            let value = try await ServerAPI.getGoatArenaSnapshot()
            guard requestID == nextID else { return }
            guard DataScope.slot == accountSlot else {
                isRefreshing = false
                loadedAccountSlot = nil
                pendingDefenderCommand = nil
                state = .idle
                return
            }
            isRefreshing = false
            installLoadedSnapshot(
                value,
                freshness: .fresh(receivedAt: Date()),
                accountSlot: accountSlot,
                authoritative: true
            )
        } catch {
            guard requestID == nextID else { return }
            guard DataScope.slot == accountSlot else {
                isRefreshing = false
                loadedAccountSlot = nil
                pendingDefenderCommand = nil
                state = .idle
                return
            }
            isRefreshing = false
            if error is CancellationError { return }
            if !ServerAPI.hasToken {
                state = .signedOut
                loadedAccountSlot = nil
                pendingDefenderCommand = nil
                defenderCommandReceipt = nil
            } else if let cached = ServerAPI.cachedGoatArenaSnapshot() {
                installLoadedSnapshot(
                    cached.snapshot,
                    freshness: .cached(
                        savedAt: cached.savedAt,
                        failure: failurePresentation(error)
                    ),
                    accountSlot: accountSlot,
                    authoritative: false
                )
            } else if let existing,
                      existingAccountSlot == accountSlot {
                installLoadedSnapshot(
                    existing.snapshot,
                    freshness: .cached(
                        savedAt: freshnessDate(existing.freshness),
                        failure: failurePresentation(error)
                    ),
                    accountSlot: accountSlot,
                    authoritative: false
                )
            } else {
                state = .failed(failurePresentation(error))
                loadedAccountSlot = nil
                pendingDefenderCommand = nil
            }
        }
    }

    @MainActor
    private func installLoadedSnapshot(
        _ snapshot: Snapshot,
        freshness: SnapshotFreshness,
        accountSlot: String,
        authoritative: Bool
    ) {
        state = .loaded(
            LoadedContent(
                snapshot: snapshot,
                freshness: freshness
            )
        )
        loadedAccountSlot = accountSlot
        reconcileDefenderCommandState(
            snapshot: snapshot,
            accountSlot: accountSlot,
            authoritative: authoritative
        )
        if authoritative {
            if let presentation = snapshot.rankUpPresentation {
                store.presentRankPromotion(
                    tierCode: presentation.tierCode,
                    presentationId: presentation.id)
            } else {
                // 구버전 서버만 현재 티어 변화 감지를 보조 경로로 사용한다.
                store.observeArenaTier(snapshot.ranking.skill.tier)
            }
        }
    }

    private func freshnessDate(_ freshness: SnapshotFreshness) -> Date {
        switch freshness {
        case .fresh(let receivedAt): return receivedAt
        case .cached(let savedAt, _): return savedAt
        }
    }

    private func failurePresentation(_ error: Error) -> FailurePresentation {
        if error is DecodingError {
            return FailurePresentation(
                kind: .incompatible,
                message: "서버 응답 형식을 확인할 수 없습니다. 앱과 서버를 업데이트한 뒤 다시 시도해 주세요.")
        }
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost,
                    .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
                return FailurePresentation(
                    kind: .offline,
                    message: "인터넷 연결을 확인한 뒤 다시 시도해 주세요.")
            case .timedOut:
                return FailurePresentation(
                    kind: .timeout,
                    message: "잠시 후 다시 시도해 주세요.")
            default:
                return FailurePresentation(
                    kind: .server,
                    message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.")
            }
        }
        if let apiError = error as? ServerAPIError {
            if apiError.code == "GOAT_ARENA_VERSION_MISMATCH"
                || apiError.statusCode == 404 {
                return FailurePresentation(
                    kind: .incompatible,
                    message: "GOAT Arena 서버 기능과 앱 버전을 확인한 뒤 다시 시도해 주세요.")
            }
            if apiError.statusCode == 429 {
                return FailurePresentation(
                    kind: .server,
                    message: "새로고침 요청이 많습니다. 잠시 후 다시 시도해 주세요.")
            }
        }
        return FailurePresentation(
            kind: .server,
            message: "GOAT Arena 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
    }

    #if DEBUG
    @MainActor
    private func applyDebugFixtureIfPresent() -> Bool {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-goatFixture"),
              index + 1 < arguments.count else { return false }

        switch arguments[index + 1].lowercased() {
        case "active":
            state = fixtureState(GoatArenaFixture.make())
        case "main":
            state = fixtureState(GoatArenaFixture.make(main: true))
        case "day30":
            state = fixtureState(GoatArenaFixture.make(day: 30, policyPending: true))
        case "policy":
            state = fixtureState(GoatArenaFixture.make(policyPending: true))
        case "match":
            state = fixtureState(GoatArenaFixture.make(includeMatch: true))
        case "matchplay":
            state = fixtureState(GoatArenaFixture.make(includeMatch: true))
            matchLaunch = MatchLaunch(id: "fixture-match")
        case "defender":
            state = fixtureState(
                GoatArenaFixture.make(
                    includeMatch: true,
                    matchStatus: "MATCHED",
                    matchRole: "DEFENDER"
                )
            )
        case "submitted":
            state = fixtureState(
                GoatArenaFixture.make(
                    includeMatch: true,
                    attemptStatus: "SUBMITTED"))
        case "requested":
            state = fixtureState(
                GoatArenaFixture.make(includeMatch: true, matchStatus: "REQUESTED"))
        case "held":
            state = fixtureState(
                GoatArenaFixture.make(includeMatch: true, matchStatus: "HELD"))
        case "empty":
            state = fixtureState(GoatArenaFixture.make(noCycle: true))
        case "placement":
            state = fixtureState(
                GoatArenaFixture.make(skillStatus: "PLACEMENT_PENDING", seatStatus: "PLACEMENT_PENDING"))
        case "hidden":
            state = fixtureState(GoatArenaFixture.make(seatStatus: "HIDDEN"))
        case "settling":
            state = fixtureState(
                GoatArenaFixture.make(main: true, cycleStatus: "MAIN_SETTLING", seatStatus: "SETTLING"))
        case "closed":
            state = fixtureState(
                GoatArenaFixture.make(noCycle: true, seatStatus: "CLOSED"))
        case "offline":
            state = .loaded(
                LoadedContent(
                    snapshot: GoatArenaFixture.make(includeMatch: true),
                    freshness: .cached(
                        savedAt: Date().addingTimeInterval(-45 * 60),
                        failure: FailurePresentation(
                            kind: .offline,
                            message: "인터넷 연결을 확인한 뒤 다시 시도해 주세요."))))
        case "stale":
            state = .loaded(
                LoadedContent(
                    snapshot: GoatArenaFixture.make(),
                    freshness: .cached(
                        savedAt: Date().addingTimeInterval(-3 * 60 * 60),
                        failure: FailurePresentation(
                            kind: .server,
                            message: "서버의 최신 기록을 확인하지 못했습니다."))))
        case "loading":
            state = .loading
        case "signedout":
            state = .signedOut
        case "failure":
            state = .failed(
                FailurePresentation(
                    kind: .server,
                    message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."))
        default:
            return false
        }
        loadedAccountSlot = DataScope.slot
        if case .loaded(let content) = state {
            let authoritative: Bool
            switch content.freshness {
            case .fresh:
                authoritative = true
            case .cached:
                authoritative = false
            }
            reconcileDefenderCommandState(
                snapshot: content.snapshot,
                accountSlot: DataScope.slot,
                authoritative: authoritative
            )
        }
        return true
    }

    private func fixtureState(_ snapshot: Snapshot) -> LoadState {
        .loaded(
            LoadedContent(
                snapshot: snapshot,
                freshness: .fresh(receivedAt: Date())))
    }
    #endif
}

// MARK: - Account-scoped defender command recovery

private enum GoatArenaDefenderCommandAction: String, Codable, Equatable {
    case accept = "ACCEPT"
    case decline = "DECLINE"
}

private struct GoatArenaPendingDefenderCommand: Codable, Equatable {
    let action: GoatArenaDefenderCommandAction
    let reasonCode: ServerAPI.GoatArenaDeclineReasonCode?
}

private struct GoatArenaDefenderCommandKeys: Codable {
    let matchId: String
    let acceptCommandId: String
    let declineCommandId: String
    let clientBuildVersion: String
    var pending: GoatArenaPendingDefenderCommand?

    private enum CodingKeys: String, CodingKey {
        case matchId
        case acceptCommandId
        case declineCommandId
        case clientBuildVersion
        case pending
    }

    init(
        matchId: String,
        acceptCommandId: String,
        declineCommandId: String,
        clientBuildVersion: String,
        pending: GoatArenaPendingDefenderCommand?
    ) {
        self.matchId = matchId
        self.acceptCommandId = acceptCommandId
        self.declineCommandId = declineCommandId
        self.clientBuildVersion = clientBuildVersion
        self.pending = pending
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        matchId = try values.decode(String.self, forKey: .matchId)
        acceptCommandId = try values.decode(
            String.self,
            forKey: .acceptCommandId
        )
        declineCommandId = try values.decode(
            String.self,
            forKey: .declineCommandId
        )
        let storedBuild = try values.decodeIfPresent(
            String.self,
            forKey: .clientBuildVersion
        )?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let storedBuild, !storedBuild.isEmpty {
            clientBuildVersion = storedBuild
        } else {
            clientBuildVersion = ServerAPI.clientBuildVersion
        }
        pending = try values.decodeIfPresent(
            GoatArenaPendingDefenderCommand.self,
            forKey: .pending
        )
    }
}

private struct GoatArenaPreparedDefenderCommand {
    let keys: GoatArenaDefenderCommandKeys
    let pending: GoatArenaPendingDefenderCommand
}

private enum GoatArenaDefenderCommandError: Error {
    case conflictingPending
    case persistenceFailed
    case invalidDeclineReason
    case invalidResponse
    case accountChanged
}

private enum GoatArenaDefenderCommandStore {
    private static let fileName = "goat-arena-defender-command-keys.json"

    private static var fileURL: URL {
        DataScope.url(fileName)
    }

    static func load(matchId: String) throws -> GoatArenaDefenderCommandKeys? {
        try readAll().first { $0.matchId == matchId }
    }

    static func prepare(
        matchId: String,
        action: GoatArenaDefenderCommandAction,
        reasonCode: ServerAPI.GoatArenaDeclineReasonCode?
    ) throws -> GoatArenaPreparedDefenderCommand {
        if action == .decline, reasonCode == nil {
            throw GoatArenaDefenderCommandError.invalidDeclineReason
        }

        let proposed = GoatArenaPendingDefenderCommand(
            action: action,
            reasonCode: action == .decline ? reasonCode : nil
        )
        var values = try readAll()
        let index = values.firstIndex { $0.matchId == matchId }
        var keys: GoatArenaDefenderCommandKeys

        if let index {
            keys = values[index]
            if let pending = keys.pending, pending != proposed {
                throw GoatArenaDefenderCommandError.conflictingPending
            }
            keys.pending = proposed
            values[index] = keys
        } else {
            keys = GoatArenaDefenderCommandKeys(
                matchId: matchId,
                acceptCommandId: UUID().uuidString,
                declineCommandId: UUID().uuidString,
                clientBuildVersion: ServerAPI.clientBuildVersion,
                pending: proposed
            )
            values.append(keys)
        }

        try write(values)
        return GoatArenaPreparedDefenderCommand(
            keys: keys,
            pending: proposed
        )
    }

    static func clear(matchId: String) throws {
        let remaining = try readAll().filter { $0.matchId != matchId }
        try write(remaining)
    }

    private static func readAll() throws -> [GoatArenaDefenderCommandKeys] {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return []
        }
        do {
            let data = try Data(contentsOf: fileURL)
            return try JSONDecoder().decode(
                [GoatArenaDefenderCommandKeys].self,
                from: data
            )
        } catch {
            // 손상된 키 파일을 빈 값으로 덮으면 응답 유실 뒤 다른 멱등키를 보내게
            // 된다. 읽을 수 없을 때는 명령 자체를 막아 중복 결정을 피한다.
            throw GoatArenaDefenderCommandError.persistenceFailed
        }
    }

    private static func write(
        _ values: [GoatArenaDefenderCommandKeys]
    ) throws {
        do {
            let data = try JSONEncoder().encode(values)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            throw GoatArenaDefenderCommandError.persistenceFailed
        }
    }
}

#if DEBUG
private enum GoatArenaFixture {
    typealias Snapshot = ServerAPI.GoatArenaSnapshot

    static func make(
        day: Int = 18,
        main: Bool = false,
        policyPending: Bool = false,
        includeMatch: Bool = false,
        noCycle: Bool = false,
        cycleStatus: String? = nil,
        skillStatus: String = "CONFIRMED",
        seatStatus: String? = nil,
        matchStatus: String = "IN_PROGRESS",
        matchRole: String = "CHALLENGER",
        attemptStatus: String? = nil
    ) -> Snapshot {
        let ranking = main ? "MAIN" : "SUB"
        let refundDays = main ? 30 : 27
        let completed = 2
        let effectiveSeatStatus = seatStatus ?? (noCycle ? "NOT_SEEDED" : "ACTIVE")
        let hasSeat = ["ACTIVE", "HIDDEN", "SETTLING"].contains(effectiveSeatStatus)

        let cycle: Snapshot.Cycle? = noCycle ? nil : Snapshot.Cycle(
            id: "fixture-cycle",
            status: cycleStatus
                ?? (day == 30 ? "SUB_CLOSING" : (main ? "MAIN_ACTIVE" : "SUB_ACTIVE")),
            activeRanking: ranking,
            cycleDay: day,
            phase: day == 30 ? "COMPLETION_PASS" : "PAID_ACCESS",
            startsOn: "2026-07-01",
            paidAccessEndsOn: "2026-07-29",
            day30ReviewOn: "2026-07-30",
            access: Snapshot.Cycle.Access(
                paidAccessActive: day <= 29,
                completionPassActive: day == 30,
                learningAccessActive: true,
                paidAccessDaysRemaining: max(0, 30 - day)),
            balances: Snapshot.Cycle.Balances(
                refundAvailableDays: refundDays,
                refundLockedDays: includeMatch ? 1 : 0,
                bonusAvailableDays: main ? 34 : 0,
                bonusLockedDays: 0,
                source: "LEDGER_DERIVED_CACHE"),
            attendance: Snapshot.Cycle.Attendance(
                cycleStreakDays: day,
                lastRecognizedDate: "2026-07-18"),
            challenges: Snapshot.Cycle.Challenges(
                completed: completed,
                completedNormal: 1,
                completedRevenge: 1,
                requestCount: 5,
                minimumRequired: 2,
                requestLimit: nil,
                newRequestCutoffDay: 28),
            integrityState: "CLEAR",
            autoRenewEnabled: false)

        let conditions: [Snapshot.Payback.Condition] = noCycle ? [] : [
            .init(
                key: "CYCLE_ATTENDANCE",
                current: day,
                required: 30,
                met: day >= 30),
            .init(
                key: "REFUND_DAY_BALANCE",
                current: refundDays,
                required: 30,
                met: refundDays >= 30),
            .init(
                key: "COMPLETED_SUB_CHALLENGES",
                current: completed,
                required: 2,
                met: completed >= 2),
        ]

        let match: Snapshot.ActiveMatch? = includeMatch ? .init(
            id: "fixture-match",
            status: matchStatus,
            role: matchRole,
            matchType: "REVENGE",
            activeRanking: ranking,
            myPositionBefore: 7,
            opponentPositionBefore: 5,
            stake: .init(
                assetType: main ? "BONUS_ACCESS_DAY" : "REFUND_CHALLENGE_DAY",
                days: main ? 3 : 2),
            startsBy: "2026-07-30T10:20:00.000Z",
            submitsBy: "2026-07-30T11:00:00.000Z",
            integrityState: "CLEAR",
            attempt: attemptStatus.map {
                .init(
                    status: $0,
                    startedAt: "2026-07-30T10:08:00.000Z",
                    endsAt: "2026-07-30T10:38:00.000Z",
                    submittedAt: $0 == "SUBMITTED"
                        ? "2026-07-30T10:32:00.000Z" : nil)
            }) : nil

        return Snapshot(
            readModelVersion: "GOAT_ARENA_V1",
            generatedAt: "2026-07-30T10:00:00.000Z",
            state: noCycle ? "NO_ACTIVE_CYCLE" : "ACTIVE_CYCLE",
            identity: .init(
                displayName: "수학왕",
                schoolName: "경기외국어고등학교",
                displayMode: "nickname"),
            cycle: cycle,
            payback: .init(
                state: noCycle ? "NO_ACTIVE_CYCLE" : (policyPending ? "POLICY_PENDING" : "IN_PROGRESS"),
                canEvaluate: !policyPending && !noCycle,
                eligible: policyPending || noCycle ? nil : false,
                refundStatus: noCycle ? nil : "PENDING",
                conditions: conditions,
                blockers: policyPending
                    ? [.init(code: "POLICY_PENDING", fields: nil)]
                    : (includeMatch ? [.init(code: "ACTIVE_MATCH", fields: nil)] : [])),
            ranking: .init(
                activeRanking: noCycle ? nil : ranking,
                skill: .init(
                    status: skillStatus,
                    mmr: skillStatus == "PLACEMENT_PENDING" ? nil : 1_510,
                    tier: skillStatus == "PLACEMENT_PENDING" ? nil : "DIAMOND",
                    rankPoint: skillStatus == "PLACEMENT_PENDING" ? nil : 42,
                    overallRank: skillStatus == "CONFIRMED" ? 12 : nil,
                    weeklyExamsUntilConfirmed: skillStatus == "PROVISIONAL" ? 2 : 0),
                seat: .init(
                    status: effectiveSeatStatus,
                    arenaPosition: hasSeat ? 7 : nil,
                    mmrAtLastSeed: hasSeat ? 1_490 : nil,
                    seededAt: hasSeat ? "2026-07-27T00:00:00.000Z" : nil,
                    seedWeekKey: hasSeat ? "2026-W31" : nil,
                    protectionUntil: nil,
                    rankShieldUntil: main ? "2026-07-31T00:00:00.000Z" : nil),
                contract: "MMR_AND_ARENA_POSITION_ARE_SEPARATE"),
            season: noCycle ? nil : .init(
                id: "2026-season-1",
                title: "GOAT Arena · Season 1",
                status: "ACTIVE",
                currentWeekKey: "2026-W31",
                startsAt: "2026-07-01T00:00:00.000Z",
                endsAt: "2026-08-31T00:00:00.000Z"),
            activeMatch: match,
            capabilities: .init(
                paybackEvaluation: policyPending ? "POLICY_PENDING" : "READY",
                mainArena: main ? "READY" : "POLICY_PENDING",
                challengeCommands: "NOT_AVAILABLE"))
    }
}
#endif
