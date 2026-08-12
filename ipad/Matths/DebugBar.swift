//  DebugBar.swift
//  Matths
//
//  ┌─────────────────────────── 디버그 전용 컴포넌트 ────────────────────────────┐
//  │ 전역 디버그 바 — 홈·커리큘럼·평가센터·Pro·세션 모드 등 모든 화면 위에 뜬다. │
//  │ 무당벌레 버튼을 누르면 퀵 액션이 펼쳐진다:                                  │
//  │   시험   즉석 모의고사 시작 (전 유형 · 4문항 · 시각 시드)                   │
//  │   정답   현재 문항을 정답으로 채점 (실경로: 대조→코치→결과)                 │
//  │   오답   현재 문항을 오답으로 채점                                          │
//  │   Pro    사진 분석 결과 화면 직행                                           │
//  │                                                                             │
//  │ 제거 방법: MatthsApp.swift 의 "전역 디버그 바" 호출 묶음 하나만 주석 처리.  │
//  │ 릴리스 빌드에는 #if DEBUG 때문에 어차피 컴파일조차 되지 않는다.             │
//  └─────────────────────────────────────────────────────────────────────────────┘

#if DEBUG
import SwiftUI

struct DebugBar: View {
    @EnvironmentObject private var store: AppStore
    /// 리뷰용 캡처 빌드: -review 인자가 있으면 무당벌레까지 완전히 숨긴다 —
    /// 디자인 검수 산출물에 디버그 UI가 찍히면 그 자체가 오염이다.
    /// (판정은 RuntimeMode 가 전역 소유 — 화면 내부 디버그 UI 도 같은 게이트를 쓴다)
    private var reviewCapture: Bool { RuntimeMode.isReviewCapture }
    /// 항상 접힌 채로 시작한다. 폭으로 판정하던 예전 방식(hSize == .compact)은
    /// 정작 신고가 들어온 상황 — iPad 전체화면 세로 — 에서 .regular 라 한 번도 참이 아니었고,
    /// 오버레이가 RootView 위에 있어 하네스의 compact 주입도 닿지 않는 죽은 분기였다.
    /// 디버그 도구가 화면을 가리는 쪽보다 무당벌레 한 번 더 누르는 쪽이 싸다.
    @State private var open = false
    @State private var showingRankMotion = false

    var body: some View {
        if reviewCapture { EmptyView() } else { bar }
    }

    private var bar: some View {
        HStack(spacing: Tokens.Space.s2) {
            if open {
                chip("시험", enabled: true) {
                    store.startExam(types: ProblemType.allCases, count: 4)
                }
                chip("정답", enabled: store.currentProblem != nil) {
                    if let p = store.currentProblem { store.gradeCurrent(input: p.answer) }
                }
                chip("오답", enabled: store.currentProblem != nil) {
                    store.gradeCurrent(input: "DEBUG-WRONG")
                }
                chip("Pro", enabled: true) {
                    store.debugProReport = true
                    store.route = .pro
                }
                chip("휘장", enabled: true) {
                    showingRankMotion = true
                }
            }

            Button {
                withAnimation(.easeOut(duration: 0.15)) { open.toggle() }
            } label: {
                Image(systemName: "ladybug.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(open ? Tokens.primary : Tokens.text3)
                    .frame(width: 34, height: 34)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("디버그 바 \(open ? "접기" : "펼치기")")
        }
        .padding(.horizontal, Tokens.Space.s2)
        .padding(.vertical, 5)
        .background(Tokens.surface.opacity(0.96), in: Capsule())
        .overlay(Capsule().strokeBorder(Tokens.lineStrong,
                                        style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
        .shadow(color: Color(hex: 0x17171F).opacity(0.12), radius: 8, y: 2)  // v3 웜 잉크 잔재 제거
        .padding(.trailing, Tokens.Space.s4)
        // 채팅에서는 탭바 위에 입력줄이 한 겹 더 있다. 84 면 접어 놓아도 전송 버튼 위에
        // 무당벌레가 앉는다 — 그 화면에서만 입력줄 높이만큼 더 띄운다.
        .padding(.bottom, store.route == .chat ? 168 : 84)     // 하단 탭바 위
        .fullScreenCover(isPresented: $showingRankMotion) {
            RankPromotionOverlay(tierCode: "CHALLENGER")
                .environmentObject(store)
        }
    }

    private func chip(_ title: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.mCaption)
            .foregroundStyle(enabled ? Tokens.ink : Tokens.text4)
            .padding(.horizontal, Tokens.Space.s3)
            .frame(minHeight: 32)
            .background(Tokens.paper2, in: Capsule())
            .disabled(!enabled)
    }
}
#endif
