//  QuickPracticeScreen.swift
//  Matths
//
//  퀵 연습 — 수능 첫 페이지 유형을 40초 안에 하나.
//  웹 quick-practice 의 앱판 (서버 API 4종: start / submit / expire / stats).
//
//  설계 두 가지만 지킨다:
//   1. 마감은 **서버가 판정한다.** 클라 타이머는 보여주기용이고, 0 이 되면
//      expire 를 쳐서 서버 판정을 받는다 (기기 시계를 믿으면 무한 연장이 된다).
//   2. 서버 계정 전용. 게스트는 진입 자체를 막는다 (기록이 갈 곳이 없다).

import SwiftUI

struct QuickPracticeScreen: View {
    @EnvironmentObject private var store: AppStore

    private enum Phase { case idle, loading, solving, graded, failed }

    @State private var phase: Phase = .idle
    @State private var attempt: ServerAPI.QuickAttempt?
    @State private var result: ServerAPI.QuickResult?
    @State private var stats: ServerAPI.QuickStats.Row?
    @State private var answer = ""
    @State private var remaining = 40
    @State private var limitMs = 40_000
    @State private var startedAt = Date()
    @State private var pointValue = 2
    @State private var errorText: String?
    @State private var promptHeight: CGFloat = 90
    @State private var solutionHeight: CGFloat = 70
    /// 화면이 시작된 계정 슬롯과 요청 세대. 네트워크 응답을 기다리는 동안 로그아웃·
    /// 다른 계정 로그인이 일어나면 이전 학생의 문제/채점/통계를 새 화면에 붙이지 않는다.
    @State private var accountSlot = DataScope.slot
    @State private var operationID = UUID()
    @State private var statsRequestID = UUID()

    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s6) {
            header

            if !ServerAPI.hasToken {
                guestCard
            } else {
                switch phase {
                case .idle, .failed: idleCard
                case .loading:       loadingCard
                case .solving:       solvingCard
                case .graded:        gradedCard
                }
                statsCard
            }
        }
        .onAppear { loadStats() }
        .onReceive(tick) { _ in onTick() }
        .onReceive(NotificationCenter.default.publisher(for: DataScope.didSwitchNotification)) {
            guard let newSlot = $0.object as? String, newSlot != accountSlot else { return }
            switchAccount(to: newSlot)
        }
        .onDisappear {
            // URLSession 자체를 강제로 끊지는 않아도, 이후 도착하는 응답은 모두 폐기한다.
            operationID = UUID()
            statsRequestID = UUID()
        }
    }

    // MARK: 머리

    private var header: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            Text("퀵 연습").font(.mTitle).foregroundStyle(Tokens.ink)
            ExamRule()
            // 조건 요약은 카드로 쪼개지 않고 메타 행 하나로 — 세 단어면 충분하다
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s5) { metaItems }
                VStack(alignment: .leading, spacing: Tokens.Space.s2) { metaItems }
            }
            Text("수능·모평 첫 페이지에서 나오는 계산 유형입니다. 빨리 정확하게가 전부입니다.")
                .font(.mBody).foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .entrance(0)
    }

    @ViewBuilder private var metaItems: some View {
        metaItem("timer", "40초")
        metaItem("1.circle", "한 문항")
        metaItem("target", "취약 개념 기반")
    }

    private func metaItem(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.mMicro).foregroundStyle(Tokens.text3)
            Text(text).font(.mCaption).foregroundStyle(Tokens.text2).monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    /// 게스트 게이트 — "이용할 수 없습니다"로 끝내지 않는다. 가치 한 줄과
    /// 로그인 경로를 함께 준다. 트리거는 RankArena 로그인 배너와 같다
    /// (store.signOut — 게스트 슬롯을 비우고 인증 화면으로 돌려보낸다).
    private var guestCard: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                Text("기록은 로그인부터 시작됩니다").font(.mHeading).foregroundStyle(Tokens.ink)
                Text("로그인하면 40초 기록이 계정에 쌓여 정답률과 평균 속도의 변화를 확인할 수 있습니다.")
                    .font(.mCallout).foregroundStyle(Tokens.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            quickPracticePreview
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                Button("로그인하고 시작하기") { store.signOut() }
                    .buttonStyle(PrimaryButtonStyle())
                    .frame(maxWidth: 420)
                // 게이트에서 막힌 채 끝내지 않는다 — 지금 되는 길 하나를 같이 준다
                Button("커리큘럼으로 돌아가기") { store.route = .curriculum }
                    .buttonStyle(SecondaryButtonStyle())
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .entrance(1)
    }

    private var quickPracticePreview: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Tokens.Space.s2) {
                quickPracticeStep("1", "문제 받기", "취약 개념에서 한 문항", "bolt.fill")
                quickPracticeStep("2", "40초 풀이", "서버 시간으로 공정하게", "timer")
                quickPracticeStep("3", "변화 확인", "정답률과 평균 속도", "chart.line.uptrend.xyaxis")
            }
            VStack(spacing: Tokens.Space.s2) {
                quickPracticeStep("1", "문제 받기", "취약 개념에서 한 문항", "bolt.fill")
                quickPracticeStep("2", "40초 풀이", "서버 시간으로 공정하게", "timer")
                quickPracticeStep("3", "변화 확인", "정답률과 평균 속도", "chart.line.uptrend.xyaxis")
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("퀵 연습 진행, 취약 개념 문제 받기, 40초 풀이, 정답률과 평균 속도 확인")
    }

    private func quickPracticeStep(
        _ index: String,
        _ title: String,
        _ detail: String,
        _ icon: String
    ) -> some View {
        HStack(spacing: Tokens.Space.s3) {
            ZStack {
                Circle().fill(Tokens.primarySoft)
                Image(systemName: icon)
                    .font(.mCaption.weight(.bold))
                    .foregroundStyle(Tokens.primary)
            }
            .frame(width: 38, height: 38)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(index)단계").font(.mMicro).foregroundStyle(Tokens.primary)
                Text(title).font(.mBodyB).foregroundStyle(Tokens.ink)
                Text(detail).font(.mCaption).foregroundStyle(Tokens.text3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 78, alignment: .leading)
        .padding(Tokens.Space.s3)
        .background(Tokens.paper, in: RoundedRectangle(cornerRadius: Tokens.Radius.sm))
    }

    // MARK: 대기 — 배점 고르고 시작

    private var idleCard: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            Text("배점").font(.mCaption).foregroundStyle(Tokens.text3)
            Picker("배점", selection: $pointValue) {
                // 배점은 **2·3점뿐**이다. 서버 allowedPoints=[2,3] 이고,
                // 그 밖의 값을 보내면 서버가 둘 중 하나를 무작위로 바꿔 버린다.
                // 예전엔 "4점" 탭이 있어서, 학생은 4점을 골랐다고 믿는데
                // 실제로는 2점이나 3점 문제가 나왔다.
                Text("2점").tag(2)
                Text("3점").tag(3)
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 320)

            if let e = errorText {
                // 실패는 이유까지 말해야 학생이 다음 행동을 고른다.
                // 예전엔 "문제를 받지 못했습니다" 한 줄이라, 서버가 잠깐 안 되는 건지
                // 앱이 고장난 건지 알 수 없어 학생이 그 자리에서 멈췄다.
                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    Text(e).font(.mCaption).foregroundStyle(Tokens.danger)
                        .fixedSize(horizontal: false, vertical: true)
                    // 퀵 연습은 마감 판정이 서버 몫이라 오프라인 대체가 없다(설계).
                    // 대신 기기 안에서 끝나는 길을 알려 준다.
                    Text("퀵 연습은 시간 판정을 서버가 맡아 인터넷이 필요합니다. "
                         + "지금 바로 풀고 싶다면 커리큘럼의 연습 문제나 오답노트 복습은 "
                         + "기기 안에서 그대로 됩니다.")
                        .font(.mCaption).foregroundStyle(Tokens.text3)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Button("문제 뽑기") { start() }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 420)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .entrance(1)
    }

    private var loadingCard: some View {
        HStack(spacing: Tokens.Space.s3) {
            ProgressView().controlSize(.small)
            Text("문제를 뽑는 중…").font(.mCallout).foregroundStyle(Tokens.text2)
            Spacer()
        }
        .card()
        .entrance(1)
    }

    // MARK: 풀이 — 타이머 + 발제문 + 답 입력

    private var solvingCard: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            if let a = attempt {
                HStack(spacing: Tokens.Space.s3) {
                    Text(a.topicLabel ?? "").font(.mBodyB).foregroundStyle(Tokens.ink)
                    if let v = a.variantLabel {
                        Text(v).font(.mCaption).foregroundStyle(Tokens.text3)
                    }
                    Spacer()
                    Text("\(remaining)초")
                        .font(.mStat)
                        .foregroundStyle(remaining <= 10 ? Tokens.danger : Tokens.ink)
                        .monospacedDigit()
                }
                ProgressBar(value: Double(remaining) / Double(max(1, limitMs / 1000)))

                KatexText(text: MathText.normalizeDelimiters(a.prompt), height: $promptHeight)

                TextField("답", text: $answer)
                    .textFieldStyle(.roundedBorder)
                    .font(.mBody)
                    .submitLabel(.done)
                    .onSubmit { submit() }

                Button("제출") { submit() }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(answer.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .entrance(1)
    }

    // MARK: 채점 결과

    private var gradedCard: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            if let r = result {
                HStack(spacing: Tokens.Space.s3) {
                    Image(systemName: r.expired == true ? "clock.badge.exclamationmark"
                          : (r.correct == true ? "checkmark.circle.fill" : "xmark.circle.fill"))
                        .font(.system(size: 26))
                        .foregroundStyle(r.expired == true ? Tokens.warning
                                         : (r.correct == true ? Tokens.success : Tokens.danger))
                    Text(r.expired == true ? "시간 초과"
                         : (r.correct == true ? "정답" : "오답"))
                        .font(.mHeading).foregroundStyle(Tokens.ink)
                    Spacer()
                    if let ms = r.responseTimeMs {
                        Text(String(format: "%.1f초", Double(ms) / 1000))
                            .font(.mCaption).foregroundStyle(Tokens.text3).monospacedDigit()
                    }
                }

                if let sol = r.solution, !sol.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("풀이").font(.mMicro).foregroundStyle(Tokens.text3)
                        KatexText(text: MathText.normalizeDelimiters(sol), height: $solutionHeight)
                    }
                }

                HStack(spacing: Tokens.Space.s3) {
                    Button("다음 문제") { start() }
                        .buttonStyle(PrimaryButtonStyle())
                    Button("그만하기") { phase = .idle; attempt = nil; result = nil }
                        .buttonStyle(SecondaryButtonStyle())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .entrance(1)
    }

    // MARK: 누적 기록

    @ViewBuilder private var statsCard: some View {
        if let s = stats, (s.total ?? 0) > 0 {
            VStack(alignment: .leading, spacing: 0) {
                SectionRule(title: "누적 기록")
                    .padding(.bottom, Tokens.Space.s2)
                HStack(spacing: 0) {
                    statTile("푼 문항", "\(s.total ?? 0)", "문항")
                    Divider().frame(height: 34)
                    statTile("정답", "\(s.correct ?? 0)", "문항")
                    Divider().frame(height: 34)
                    statTile("정답률", "\(Int(s.accuracy ?? 0))", "%")   // 서버가 이미 0~100 정수로 준다
                    Divider().frame(height: 34)
                    statTile("평균", String(format: "%.1f", Double(s.averageMs ?? 0) / 1000), "초")
                }
            }
            .card()
            .entrance(2)
        }
    }

    private func statTile(_ label: String, _ value: String, _ unit: String) -> some View {
        VStack(spacing: 3) {
            Text(label).font(.mMicro).foregroundStyle(Tokens.text3)
            (Text(value).font(.mStat) + Text(" \(unit)").font(Font.stat(13)))
                .foregroundStyle(Tokens.ink)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: 동작

    /// 문제 받기 실패 문구 — 원인을 구분해서 말한다.
    /// URLError 는 "서버가 멀쩡한데 내 인터넷이 없는" 경우라 안내가 달라야 한다.
    private static func startFailureText(_ error: Error) -> String {
        if let u = error as? URLError {
            switch u.code {
            case .notConnectedToInternet, .networkConnectionLost:
                return "인터넷에 연결되어 있지 않습니다."
            case .timedOut:
                return "응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요."
            case .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
                return "서비스에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요."
            default:
                return "네트워크 문제로 연습 문제를 받지 못했습니다. 다시 시도해 주세요."
            }
        }
        if let s = (error as? ServerAPIError)?.errorDescription { return s }
        return "문제를 받지 못했습니다."
    }

    private func loadStats() {
        guard ServerAPI.hasToken else { return }
        let ownerSlot = accountSlot
        let requestID = UUID()
        statsRequestID = requestID
        Task {
            let loaded = try? await ServerAPI.quickPracticeStats()
            guard ownerSlot == accountSlot,
                  ownerSlot == DataScope.slot,
                  statsRequestID == requestID else { return }
            stats = loaded
        }
    }

    private func start() {
        guard ServerAPI.hasToken, accountSlot == DataScope.slot else { return }
        let ownerSlot = accountSlot
        let requestID = UUID()
        let selectedPointValue = pointValue
        operationID = requestID
        phase = .loading
        errorText = nil
        answer = ""
        result = nil
        Task {
            do {
                let s = try await ServerAPI.quickPracticeStart(pointValue: selectedPointValue)
                guard ownsOperation(requestID, slot: ownerSlot) else { return }
                attempt = s.attempt
                limitMs = s.timeLimitMs ?? 40_000
                remaining = max(1, limitMs / 1000)
                startedAt = Date()
                phase = .solving
            } catch {
                guard ownsOperation(requestID, slot: ownerSlot) else { return }
                errorText = Self.startFailureText(error)
                phase = .failed
            }
        }
    }

    private func submit() {
        guard let a = attempt,
              phase == .solving,
              accountSlot == DataScope.slot else { return }
        let ownerSlot = accountSlot
        let requestID = UUID()
        let submittedAnswer = answer
        let elapsed = Int(Date().timeIntervalSince(startedAt) * 1000)
        operationID = requestID
        phase = .loading
        Task {
            do {
                let graded = try await ServerAPI.quickPracticeSubmit(
                    instanceId: a.instanceId, answer: submittedAnswer, elapsedMs: elapsed)
                guard ownsOperation(requestID, slot: ownerSlot) else { return }
                result = graded
                phase = .graded
                loadStats()
            } catch {
                guard ownsOperation(requestID, slot: ownerSlot) else { return }
                errorText = (error as? ServerAPIError)?.errorDescription ?? "채점에 실패했습니다"
                phase = .failed
            }
        }
    }

    /// 클라 타이머는 표시용. 0 이 되면 **서버에** 마감 판정을 받는다.
    private func onTick() {
        guard phase == .solving else { return }
        remaining = max(0, remaining - 1)
        guard remaining == 0,
              let a = attempt,
              accountSlot == DataScope.slot else { return }
        let ownerSlot = accountSlot
        let requestID = UUID()
        operationID = requestID
        phase = .loading
        Task {
            do {
                let r = try await ServerAPI.quickPracticeExpire(instanceId: a.instanceId)
                guard ownsOperation(requestID, slot: ownerSlot) else { return }
                if r.pending == true {
                    // 서버는 아직 시간이 남았다고 본다 — 클라 시계가 빨랐다. 1초 더 준다.
                    remaining = 1
                    phase = .solving
                } else {
                    result = r
                    phase = .graded
                    loadStats()
                }
            } catch {
                guard ownsOperation(requestID, slot: ownerSlot) else { return }
                errorText = (error as? ServerAPIError)?.errorDescription ?? "시간 초과 처리에 실패했습니다"
                phase = .failed
            }
        }
    }

    private func ownsOperation(_ requestID: UUID, slot: String) -> Bool {
        operationID == requestID && accountSlot == slot && DataScope.slot == slot
    }

    private func switchAccount(to newSlot: String) {
        // 먼저 기존 요청 세대를 무효화한 뒤 새 계정의 빈 화면으로 바꾼다.
        operationID = UUID()
        statsRequestID = UUID()
        accountSlot = newSlot
        phase = .idle
        attempt = nil
        result = nil
        stats = nil
        answer = ""
        remaining = 40
        limitMs = 40_000
        errorText = nil
        loadStats()
    }
}
