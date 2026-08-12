//  RootView.swift
//  Matths
//
//  앱 셸 — 상단 슬림바 + 하단 탭바.
//
//  탭은 동급 목적지 5개만 둔다(홈·커리큘럼·평가센터·오답노트·GOAT Arena).
//  도구는 탭이 아니다: AI 튜터는 상단바 sparkles 버튼, 채점 Pro 는 평가센터의
//  진입 카드로 들어간다. Route 와 화면은 그대로 두고 진입점만 옮겼다.
//
//  사이드바를 걷어낸 이유:
//   1. 목적지가 5개다. 사이드바를 쓸 만큼 깊지 않다.
//   2. Split View 1/2(13인치 가로에서 약 507pt)에서 260pt 사이드바를 빼면
//      본문에 247pt만 남는다. 필기 캔버스가 들어가는 화면에서는 못 쓴다.
//   3. 폭에 따라 사이드바/탭바로 갈리면 내비게이션이 두 벌이 된다.
//      학생이 창 크기를 바꿀 때마다 "메뉴가 어디 갔지"를 다시 배워야 한다.
//
//  그래서 어떤 폭에서도 하단 바 하나로 간다.
//  Slide Over(320pt)든 13인치 전체화면(1366pt)이든 같은 자리에 같은 메뉴가 있다.
//
//  세션 모드(문제 풀이/결과)에서는 두 바를 모두 걷어낸다.
//  푸는 동안 화면에 남는 것은 문제와 캔버스뿐이다.

import Foundation
import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: AppStore

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var systemColorScheme

    var body: some View {
        Group {
            if store.isSessionMode {
                sessionContent
            } else {
                browseContent
                    .safeAreaInset(edge: .top, spacing: 0) { AppTopBar() }
                    .safeAreaInset(edge: .bottom, spacing: 0) { MainTabBar() }
            }
        }
        .background(store.isArenaRoute ? Tokens.brandNavy : Tokens.paper)
        // GOAT Arena는 시스템이 라이트 모드여도 독립된 다크 경기장으로 전환한다.
        // 탭을 벗어나면 nil로 되돌려 사용자의 원래 외관 설정을 즉시 복원한다.
        .preferredColorScheme(store.isArenaRoute ? .dark : nil)
        .environment(\.colorScheme, store.isArenaRoute ? .dark : systemColorScheme)
        // 페이지 전환 애니메이션 — 모션 꺼짐/동작 줄이기에서는 nil 로 즉시 전환
        .animation(store.motionOn && !reduceMotion
                   ? .spring(response: 0.35, dampingFraction: 0.9) : nil,
                   value: store.route)
        // 시험지 웹뷰 코디네이터가 스토어에 닿는 통로 (파일 하단 AppStoreLocator 주석 참조)
        .onAppear { AppStoreLocator.shared = store; store.wireSyncCallbacks() }
    }

    @ViewBuilder private var browseContent: some View {
        if store.route == .chat {
            // 채팅은 자체 스크롤 + 하단 입력바 — 바깥 ScrollView 에 넣으면
            // 키보드/스크롤이 이중이 된다
            ChatScreen()
                .routeTransition(store.route)
        } else if store.route == .curriculum {
            // 학습 맵도 자체 세로 스크롤(경로 앵커링)을 가진다 — 채팅과 같은 특례
            CurriculumV2MapScreen()
                .routeTransition(store.route)
        } else if store.route == .arenaShop {
            // 상점은 자체 NavigationStack·스크롤을 가진다. 바깥 ScrollView에 넣으면
            // 새로고침과 큰 글씨에서 스크롤이 이중으로 잡힌다.
            ArenaShopScreen()
                .routeTransition(store.route)
        } else {
            browseScroll
        }
    }

    @ViewBuilder private var browseScroll: some View {
        ScrollView {
            Group {
                switch store.route {
                case .home:       HomeScreen()
                case .curriculum: CurriculumV2MapScreen()   // 특례 분기가 먼저 잡는다 — 방어용
                case .concept:    ConceptScreenV2()
                case .assess:     AssessmentScreen()
                case .wrongNotes: WrongNotesScreen()
                case .rank:
                    // 비로그인은 죽은 게이트 대신 순위표 미리보기(RankArenaScreen) —
                    // 로그인하면 기존 GOAT Arena 풀 화면 그대로
                    if store.authProvider == "server" { GoatArenaScreen() }
                    else { RankArenaScreen() }
                case .arenaShop: ArenaShopScreen() // 특례 분기가 먼저 잡는다 — 방어용
                case .pro:        ProScreen()
                case .chat:       ChatScreen()
                case .quickPractice: QuickPracticeScreen()
                case .profile:    ProfileScreen()
                default:          HomeScreen()
                }
            }
            .routeTransition(store.route)
            .frame(maxWidth: .infinity, alignment: .leading)
            .readableWidth()
            .adaptiveHPadding()
            .padding(.vertical, Tokens.Space.s8)   // 상하 숨통 — 20→32
            // safeAreaInset이 스크롤 뷰포트는 줄여도 마지막 섹션 자체의 여백은
            // 만들지 않는다. 320pt Split View에서 제목이 탭바 바로 뒤에 멈추지 않게 한다.
            .padding(.bottom, 76)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    @ViewBuilder private var sessionContent: some View {
        Group {
            switch store.route {
            case .solve:  SolveScreen()
            case .result: ResultScreen()
            case .kice:
                KiceExamScreen()
                    .protectedAssessmentSurface("kice-exam")
            case .paper:
                AssessmentPaperScreen()
                    .protectedAssessmentSurface("assessment-paper")
            case .placement:
                PlacementExamScreen()
                    .protectedAssessmentSurface("placement-exam")
            case .weeklyMock:
                WeeklyMockScreen()
                    .protectedAssessmentSurface("weekly-mock")
            default:      EmptyView()
            }
        }
        .routeTransition(store.route)
    }
}

// MARK: - 폭 적응
//
// iPad 는 320pt(Slide Over)부터 1366pt(13인치 가로)까지 온다.
// 양 끝을 모두 견디게 하는 규칙을 한 곳에 모아둔다.

private struct ReadableWidth: ViewModifier {
    /// 한 줄이 이보다 길어지면 눈이 다음 줄 첫 글자를 못 찾는다.
    var limit: CGFloat = Tokens.readableWidth

    func body(content: Content) -> some View {
        content
            .frame(maxWidth: limit, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .center)
    }
}

private struct AdaptiveHPadding: ViewModifier {
    @Environment(\.horizontalSizeClass) private var hSize

    func body(content: Content) -> some View {
        // 좁을 때 32pt 를 그대로 두면 본문이 설 자리가 없다.
        content.padding(.horizontal, hSize == .compact ? Tokens.Space.s4 : Tokens.Space.s8)
    }
}

extension View {
    func readableWidth(_ limit: CGFloat = Tokens.readableWidth) -> some View {
        modifier(ReadableWidth(limit: limit))
    }

    /// 좌우 여백. 본문과 상단바가 **같은 순서로** 이걸 쓰기 때문에
    /// 브랜드 로고와 본문 첫 글자의 왼쪽 끝이 정확히 맞는다.
    /// 순서를 바꾸면(패딩을 폭 제한 안쪽에 넣으면) 그만큼 어긋난다.
    func adaptiveHPadding() -> some View {
        modifier(AdaptiveHPadding())
    }
}

// MARK: - 상단 슬림바

struct AppTopBar: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    /// 오늘 학습했는지 — 홈 스트릭 칩과 같은 판정 축(학습일 기록).
    /// 스트릭은 보상 지표라 경고색(warning)을 쓰지 않는다 (0408 — 보상/경고 팔레트 분리).
    private var studiedToday: Bool {
        store.activityDays.contains(ActivityLog.dayString())
    }

    private var isArena: Bool {
        store.isArenaRoute
    }

    var body: some View {
        HStack(spacing: Tokens.Space.s3) {
            // 밝은 셸의 브랜드 식별은 심볼+텍스트 재조합이 아니라 CI 원본
            // Primary Identity를 그대로 쓴다. Arena 네이비는 icon-only 문맥으로
            // 공식 심볼 타일을 유지한다.
            if isArena {
                BrandMark(tile: true)
                    .frame(width: 28, height: 28)
                    .accessibilityLabel("Matths")
            } else {
                PrimaryBrandIdentity()
                    .frame(width: 120, height: 37)
                    .accessibilityLabel("Matths")
            }

            Spacer(minLength: Tokens.Space.s2)

            // 연속 학습일. 끊기는 게 아까워서 다시 열게 만드는 숫자이므로
            // 학습 화면 어디서나 보이는 상단 상태로 유지한다.
            // 알약 배경 없이 불꽃과 세리프 숫자만 둔다.
            // 색은 홈 스트릭 칩과 같은 문법 — 오늘 학습했으면 rewardGold, 아니면 중립.
            HStack(spacing: 4) {
                Image(systemName: studiedToday ? "flame.fill" : "flame")
                    .font(dynamicTypeSize.isAccessibilitySize
                          ? .system(size: 18, weight: .semibold)
                          : .mCaption)
                Text("\(store.streakDays)")
                    .font(dynamicTypeSize.isAccessibilitySize
                          ? .system(size: 20, weight: .bold, design: .rounded)
                          : .mStat)
            }
            .foregroundStyle(studiedToday
                ? Tokens.rewardGold
                : (isArena ? Tokens.onNavy.opacity(0.58) : Tokens.text3))
            .accessibilityElement(children: .combine)
            .accessibilityLabel(studiedToday
                ? "\(store.streakDays)일 연속 학습, 오늘 학습 완료"
                : "\(store.streakDays)일 연속 학습, 오늘은 아직 학습 전")

            // AI 튜터 — 탭바에서 옮겨 온 진입점 (탭은 동급 목적지 5개만 남긴다).
            // 화면(ChatScreen)과 라우트는 그대로, 문은 여기 하나다.
            Button { store.route = .chat } label: {
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(store.route == .chat
                        ? Tokens.primary
                        : (isArena ? Tokens.onNavy.opacity(0.74) : Tokens.text2))
                    .frame(width: 44, height: 44)   // 최소 터치 타겟
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("AI 튜터")

            // 프로필 — 탭을 늘리는 대신 아바타 버튼으로
            Button { store.route = .profile } label: {
                ZStack {
                    Circle().fill(isArena ? Tokens.arenaAccent : Tokens.actionPrimary)
                    Text(String(store.userName.prefix(1)))
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundStyle(Tokens.onBrand)
                }
                .frame(width: 30, height: 30)
                .overlay(Circle().strokeBorder(
                    store.route == .profile ? Tokens.primary : .clear, lineWidth: 2))
                // 시각은 30pt 아바타 그대로, 히트 영역만 44×44 로 확장 (1261·1240)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("프로필")
        }
        // 본문과 같은 폭·같은 여백으로 묶는다. 순서까지 본문과 같아야 왼쪽 끝이 맞는다.
        .readableWidth()
        .adaptiveHPadding()
        .frame(height: dynamicTypeSize.isAccessibilitySize ? 68 : 52)
        .background(isArena ? Tokens.brandNavy : Color(uiColor: .systemBackground))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(isArena ? Tokens.brandCyan.opacity(0.42) : Tokens.line)
                .frame(height: isArena ? 1 : 0.5)
        }
    }
}

// MARK: - 하단 탭바

struct MainTabBar: View {
    @EnvironmentObject private var store: AppStore

    private struct Item {
        let route: AppStore.Route
        let title: String
        let icon: String
        var badge: Int? = nil
    }

    // 탭은 동급 목적지 3~5개 원칙(0752)에 맞춰 5개만 남긴다.
    // 채점 Pro(도구)는 평가센터의 진입 카드로, AI 튜터(도구)는 상단바 버튼으로 —
    // Route enum 과 두 화면은 그대로라 기존 라우팅(.pro/.chat)은 계속 동작한다.
    private var items: [Item] {
        [
            .init(route: .home,       title: "홈",       icon: "house.fill"),
            .init(route: .curriculum, title: "커리큘럼", icon: "square.grid.2x2.fill"),
            .init(route: .assess,     title: "평가센터", icon: "flag.fill"),
            .init(route: .wrongNotes, title: "오답노트", icon: "book.fill", badge: store.dueReviewCount),
            .init(route: .rank,       title: "GOAT Arena", icon: "crown.fill"),
        ]
    }

    var body: some View {
        // 사이즈 클래스만 보면 507pt Split View와 320pt Slide Over가 둘 다 compact다.
        // 실제 가용 폭으로 판정해 507pt에서는 이름을 유지하고, 320pt에서만 아이콘으로 줄인다.
        ViewThatFits(in: .horizontal) {
            tabRow(showTitles: true)
                .frame(minWidth: 350)   // 탭 5개 기준 — 이보다 좁으면(320pt) 아이콘만
            tabRow(showTitles: false)
        }
        .adaptiveBarPadding()
        // 탭을 화면 끝까지 벌리지 않는다. 13인치 가로에서 5개가 1366pt 에 흩어지면
        // 엄지로 옮겨 다닐 수 없고, 눈으로도 한 덩어리로 안 읽힌다.
        // iPadOS 의 기본 탭바도 항목을 가운데 묶어서 보여준다.
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .padding(.top, 6)
        .background(store.isArenaRoute ? Tokens.brandNavy : Color(uiColor: .systemBackground))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(store.isArenaRoute ? Tokens.brandCyan.opacity(0.52) : Tokens.line)
                .frame(height: store.isArenaRoute ? 1 : 0.5)
        }
        // 키보드가 올라와도 탭바가 따라 올라오지 않게 한다.
        // 답을 입력하는 중에 메뉴가 튀어 오르면 오탭이 난다.
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private func tabRow(showTitles: Bool) -> some View {
        HStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.title) { index, item in
                tab(item, showTitle: showTitles, ordinal: index + 1)
            }
        }
    }

    @ViewBuilder private func tab(_ item: Item, showTitle: Bool, ordinal: Int) -> some View {
        let selected = store.selectedTab == item.route
        let isArenaItem = item.route == .rank
        let arenaShell = store.isArenaRoute

        Button {
            store.route = item.route
        } label: {
            VStack(spacing: 3) {
                ZStack(alignment: .topTrailing) {
                    // 선택 표시는 색과 굵기로만 한다. 아이콘 뒤에 알약을 깔지 않는다.
                    // 선택 순간의 바운스가 유일한 추가 모션 (모션 설정 존중).
                    TabIcon(icon: item.icon,
                            selected: selected,
                            motion: store.motionOn && !reduceMotion,
                            width: showTitle ? 52 : 36,
                            arena: isArenaItem)

                    if let badge = item.badge, badge > 0 {
                        Text("\(badge)")
                            .font(Font.stat(11, .semibold))
                            .foregroundStyle(Tokens.onPrimary)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Tokens.danger, in: Capsule())
                            .offset(x: 6, y: -4)
                    }
                }

                if showTitle {
                    Text(item.title)
                        // 고정 11pt 대신 caption2(기준 11pt) — 접근성 글자 크기를 따라간다
                        .font(.system(.caption2, weight: selected ? .bold : .medium))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            }
            .foregroundStyle(
                selected
                    ? (isArenaItem ? Tokens.brandCyan : Tokens.ink)
                    : (arenaShell ? Tokens.onNavy.opacity(0.56)
                                  : Tokens.text3))
            .frame(maxWidth: .infinity)
            .frame(minHeight: 50)          // 최소 터치 타겟 44pt 초과
            .background {
                if isArenaItem && selected {
                    RoundedRectangle(cornerRadius: Tokens.Radius.md, style: .continuous)
                        .fill(Tokens.navyElevated)
                        .overlay {
                            RoundedRectangle(cornerRadius: Tokens.Radius.md, style: .continuous)
                                .strokeBorder(
                                    Tokens.brandCyan.opacity(0.5),
                                    lineWidth: 1)
                        }
                        .padding(.horizontal, 3)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        // 하드웨어 키보드 — ⌘1~⌘5 로 다섯 탭을 오간다. ⌘ 를 길게 누르면
        // 시스템 단축키 목록에 접근성 라벨과 함께 자동 노출된다 (1651·1652).
        .keyboardShortcut(KeyEquivalent(Character("\(ordinal)")), modifiers: .command)
        .accessibilityLabel(accessibilityLabel(for: item))
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    private func accessibilityLabel(for item: Item) -> String {
        guard let badge = item.badge, badge > 0 else { return item.title }
        return "\(item.title), 처리할 항목 \(badge)개"
    }
}

/// 탭 아이콘 — 선택되는 순간에만 한 번 튄다.
///
/// `symbolEffect(.bounce, value:)` 는 값이 "바뀌면" 발동하지 방향을 보지 않는다.
/// 그래서 selected 를 그대로 넘기면 선택이 풀리는 탭(true→false)도 같이 튀어,
/// 탭을 옮길 때마다 두 아이콘이 동시에 튀었다. 발동 횟수를 직접 세서
/// "선택됨" 으로 바뀐 쪽만 올린다.
private struct TabIcon: View {
    let icon: String
    let selected: Bool
    /// 앱 모션 설정 + 동작 줄이기를 이미 반영한 값
    let motion: Bool
    let width: CGFloat
    let arena: Bool

    @State private var bounces = 0

    var body: some View {
        ZStack {
            // GOAT 전용 원형 장식은 선택됐을 때만 보인다. 선택 전에도 보라색
            // 원·테두리가 남으면 현재 탭처럼 읽혀 홈의 선택 상태와 충돌한다.
            if arena && selected {
                Circle()
                    .fill(Tokens.brandCyan.opacity(0.13))
                    .frame(width: 30, height: 30)
                Circle()
                    .strokeBorder(Tokens.brandCyan.opacity(0.7), lineWidth: 1)
                    .frame(width: 30, height: 30)
            }

            Image(systemName: icon)
                .font(.system(size: arena ? 17 : 20,
                              weight: selected ? .bold : .regular))
                .symbolEffect(.bounce, options: .speed(1.4), value: bounces)
        }
        .frame(width: width, height: 30)
        .onChange(of: selected) { _, isSelected in
            if isSelected && motion { bounces += 1 }
        }
    }
}

private struct AdaptiveBarPadding: ViewModifier {
    @Environment(\.horizontalSizeClass) private var hSize

    func body(content: Content) -> some View {
        // 320pt 에서 탭 5개가 각각 44pt+ 터치 폭을 확보하도록 좁을 때는 4pt 로 줄인다.
        // 텍스트는 MainTabBar가 숨기고 접근성 라벨은 그대로 남긴다.
        content.padding(.horizontal, hSize == .compact ? Tokens.Space.s1 : Tokens.Space.s5)
    }
}

private extension View {
    func adaptiveBarPadding() -> some View { modifier(AdaptiveBarPadding()) }
}

// MARK: - 홈
//
// 정보 대시보드가 아니라 "오늘의 미션" 화면이다 — 폴드 위에서 끝난다:
//  ① 머리: 작은 인사·날짜 한 줄 + 상태 기반 제목. 큰 제목 자리는 이름이 아니라
//     "지금 할 일" 이 가져간다(신규/복습 밀림/진행 중이 문장을 고른다).
//     스트릭 숫자는 상단바 칩이 이미 맡고 있다 — 본문에서 반복하지 않는다.
//  ② 미션 히어로: 오늘 할 다음 행동 하나 + 유일한 주 CTA. 밀린 복습이 있으면
//     카드가 복습 미션(건수 + 예상 시간 + 복습 시작)이 되고 새 개념은 보조 행으로
//     내려간다. 없으면 다음 개념 미션이다 — 판정은 제목과 같은 HomeMission 하나.
//     첫 시각 위계는 언제나 이것이다 — 통계가 미션 위로 올라오지 않는다.
//  ③ 받침: 이번 주 학습(괘선 섹션 + 3지표 + 차트, 카드 아님) ·
//     GOAT Arena 예고(화면 유일의 네이비 면). 홈의 흰 카드는 히어로 하나다.
//  시작 전(학습 기록이 아예 없는 계정)에는 ③을 통째로 걷어낸다 —
//  0분·0/7일은 빈 데이터가 아니라 죽은 숫자고, 랭킹 예고도 첫 문제를 풀기 전에는
//  남의 잔치다. 그 자리도 첫 미션 히어로가 선다.
//  로그인 만료는 화면 맨 위의 컴팩트 배너 한 장이 맡고, 아레나 예고는 접는다 —
//  만료 중 입장은 서버 랭킹 화면에서 곧장 실패한다. 대체 문구는 두지 않는다:
//  랭킹전 안내는 랭킹 탭이 담당하고, 홈의 만료 안내는 배너 하나로 끝낸다.
// 나머지(오늘 계획·취약 개념·과목 진도)는 각 목적지 화면이 맡는다.

struct HomeScreen: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @State private var dashboard = LocalDashboardSnapshot.make()
    @State private var source: DashboardActivitySource = .local
    @State private var dashboardSlot = DataScope.slot
    @State private var loadID = UUID()
    /// "다시 시도" 가 미는 재조회 토큰 — 값이 바뀌면 .task(id:) 가 새로 돈다.
    /// 계정 전환과 같은 취소·재시작 경로를 그대로 타므로 늦은 응답 가드도 동일하다.
    @State private var retryToken = UUID()

    /// 오늘 날짜 — "2026. 7. 30. 목" 형식 (기기 언어와 무관하게 웹과 같은 한국어).
    private static var todayLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.timeZone = TimeZone(identifier: "Asia/Seoul")
        formatter.dateFormat = "yyyy. M. d. E"
        return formatter.string(from: Date())
    }

    /// 게시된 계정 상태가 바뀌면 기존 task가 취소되고 새 슬롯의 로컬 스냅샷부터 그린다.
    /// 토큰은 401 처리 중 바뀔 수 있으므로 계정 식별자에 넣지 않는다. 넣으면 같은 요청의
    /// 401 응답까지 "다른 계정의 늦은 응답"으로 오인해 동기화 표시가 영원히 남는다.
    private var accountIdentity: String {
        [
            DataScope.slot,
            store.authProvider ?? "guest",
            store.userEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
        ].joined(separator: "|")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s7) {
            if displayedSource == .expired {
                SyncPausedBanner()
                    .entrance(0)
            }

            greetingHeader
                .entrance(0)

            MissionHeroCard(mission: mission)
                .entrance(1)

            if !isPreStart {
                WeeklyStudySection(activity: displayedDashboard, source: displayedSource,
                                   onRetry: { retryToken = UUID() })
                    .entrance(2)

                // 만료 중에는 아레나 예고를 조용히 접는다 — 서버 랭킹 화면이
                // 곧장 실패한다. 출구(다시 로그인)는 상단 배너 하나가 맡고,
                // 랭킹전 안내는 랭킹 탭 몫이다 — 홈에 대체 문구를 남기면
                // 상단 배너와 같은 말을 두 번 하는 고아 한 줄이 된다(RG-05).
                if displayedSource != .expired {
                    ArenaTeaserCard()
                        .entrance(3)
                }
            }
        }
        .task(id: "\(accountIdentity)|\(retryToken.uuidString)") {
            await refreshDashboard()
        }
    }

    /// 시작 전 상태 — 이 계정에 학습 기록이 아예 없다.
    /// "이번 주 0분"(복귀 사용자)과 다른 판정이다: 주간·누적·완료 개념·학습일이
    /// 전부 비어 있어야 한다. 출처가 복구 필요 상태(만료·실패·오프라인·미지원)면
    /// 서버에 기록이 있을 수 있으므로 시작 전으로 단정하지 않고 통계 섹션을 남긴다 —
    /// "다시 시도" 출구가 그 헤더에 있고, 만료의 "다시 로그인" 은 상단 배너에 있다.
    private var isPreStart: Bool {
        switch displayedSource {
        case .unsupported, .offline, .expired, .failed: return false
        case .local, .syncing, .server: break
        }
        let stats = displayedDashboard.stats
        return stats.weeklyStudyMinutes == 0
            && stats.weeklySolvedProblems == 0
            && store.solvedTotal == 0
            && store.progressV2.byConcept.isEmpty
            && store.activityDays.isEmpty
    }

    /// 계정 전환과 task 시작 사이의 한 프레임에도 앞 계정 통계를 보여 주지 않는다.
    /// 상태가 새 슬롯으로 재바인딩되기 전에는 새 슬롯의 로컬 파일을 직접 읽어 그린다.
    private var displayedDashboard: ServerAPI.DashboardActivity {
        dashboardSlot == DataScope.slot ? dashboard : LocalDashboardSnapshot.make()
    }

    private var displayedSource: DashboardActivitySource {
        dashboardSlot == DataScope.slot ? source : .local
    }

    /// 인사말은 작은 윗줄로 강등하고, 큰 제목 자리는 상태 기반 문장이 가져간다 —
    /// 화면에서 제일 큰 글자가 이름 확인이 아니라 "지금 할 일" 을 말해야 한다.
    /// 스트릭 칩은 상단바 것 하나로 충분해서 여기서 뺐다(같은 숫자 이중 표기 금지).
    private var greetingHeader: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                    greetingText
                        .fixedSize(horizontal: false, vertical: true)
                    dateText
                        .fixedSize(horizontal: false, vertical: true)
                }
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s4) {
                        greetingText
                            .lineLimit(1)
                        Spacer(minLength: Tokens.Space.s4)
                        dateText
                            .fixedSize(horizontal: true, vertical: false)
                    }

                    VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                        greetingText
                            .fixedSize(horizontal: false, vertical: true)
                        dateText
                    }
                }
            }

            Text(stateTitle)
                .font(.mTitle)
                .foregroundStyle(Tokens.ink)
                .monospacedDigit()
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            ExamRule()
        }
    }

    /// 오늘의 미션 — 제목·히어로·주 CTA 가 전부 이 판정 하나에서 나온다.
    private var mission: HomeMission { homeMission(in: store, preStart: isPreStart) }

    /// 첫 제목 — 미션 상태가 문장을 고른다: 신규 / 복습 밀림 / 진행 중 / 완료.
    /// 히어로 카드와 같은 homeMission 하나를 쓴다 — 판정이 갈라지면 제목은
    /// 복습을 말하는데 주 CTA 는 새 개념을 미는 충돌이 재발한다(회귀 R-02).
    private var stateTitle: String {
        switch mission {
        case .firstConcept:
            return "첫 개념을 시작해 볼까요?"
        case .review(let count, _):
            return "오늘 복습 \(count)개부터 정리해요"
        case .nextConcept(_, let concept):
            return "\(concept.title)\(objectParticle(concept.title)) 이어서 학습하세요"
        case .allDone:
            return "모든 개념을 완료했어요"   // 다음 행동(커리큘럼·평가)은 히어로가 안내한다
        }
    }

    private var greetingText: some View {
        Text("안녕하세요, \(store.userName)님")
            .font(.mCallout)
            .foregroundStyle(Tokens.text2)
    }

    private var dateText: some View {
        Text(Self.todayLabel)
            .font(.mCaption)
            .foregroundStyle(Tokens.text3)
    }

    @MainActor
    private func refreshDashboard() async {
        let requestID = UUID()
        let requestedAccount = accountIdentity
        loadID = requestID

        // 네트워크를 기다리는 동안 빈 스켈레톤 대신 현재 계정 슬롯의 실제 기록을 즉시 표시.
        dashboard = LocalDashboardSnapshot.make()
        dashboardSlot = DataScope.slot
        source = .local

        #if DEBUG
        if let fixture = DashboardFixture.current {
            switch fixture {
            case "active":
                dashboard = DashboardFixture.active
                source = .server
            case "zero":
                dashboard = DashboardFixture.zero
                source = .server
            case "failure":
                dashboard = DashboardFixture.active
                source = .offline
            default:
                break
            }
            return
        }
        #endif

        // 인증 제공자가 서버일 때만 원격 계정이다. 구버전 전역 프로필의 이메일이
        // 게스트 슬롯에 남은 설치를 이메일 유무만으로 서버 계정 취급하면 안 된다.
        let isServerAccount = store.authProvider == "server"
        guard isServerAccount else { return }
        guard ServerAPI.hasToken else {
            source = .expired
            return
        }

        source = .syncing

        // 서버 집계가 방금까지의 오프라인 이벤트도 포함하도록 큐를 먼저 올린다.
        await SyncEngine.shared.syncNow()
        guard !Task.isCancelled,
              requestID == loadID,
              requestedAccount == accountIdentity else { return }

        // 동기화 중 401이 났다면 SyncEngine이 오류를 보존하고 ServerAPI가 토큰을 지운다.
        guard ServerAPI.hasToken else {
            source = .expired
            return
        }

        do {
            let remote = try await ServerAPI.getDashboardActivity()
            guard !Task.isCancelled,
                  requestID == loadID,
                  requestedAccount == accountIdentity else { return }
            dashboard = remote
            source = .server
        } catch {
            guard !Task.isCancelled,
                  requestID == loadID,
                  requestedAccount == accountIdentity else { return }
            source = DashboardActivitySource(error: error)
        }
    }
}

/// 커리큘럼의 다음 미션 — 웹과 같은 v2 진도 정본의 진행 중 개념을 먼저 찾고,
/// 없으면 공통 과목의 첫 미완료, 그 다음 전체 과목의 첫 미완료를 찾는다.
/// 홈 제목(stateTitle)과 미션 히어로가 이 하나를 같이 쓴다.
@MainActor
private func nextMission(in store: AppStore) -> (course: CourseV2, concept: ConceptV2)? {
    guard let (course, _, concept) = store.progressV2.continueConcept() else { return nil }
    return (course, concept)
}

/// 홈의 오늘 미션 — 제목(stateTitle)·히어로 카드·주 CTA 가 나눠 쓰는 단일 상태.
/// 우선순위: 시작 전 → 밀린 복습 → 다음 개념 → 전 과목 완료.
/// 복습이 개념보다 먼저다 — "부터" 라는 제목 그대로, 밀린 복습을 정리해야
/// 새 학습이 쌓인다(오답노트 배지와 같은 축, store.dueReviewCount).
private enum HomeMission {
    case firstConcept(course: CourseV2, concept: ConceptV2)
    /// followUp = 다음에 배울 새 개념 — 히어로에서 "바로 가기" 보조 행으로만 보인다
    case review(count: Int, followUp: (course: CourseV2, concept: ConceptV2)?)
    case nextConcept(course: CourseV2, concept: ConceptV2)
    case allDone
}

@MainActor
private func homeMission(in store: AppStore, preStart: Bool) -> HomeMission {
    let next = nextMission(in: store)
    if preStart {
        // 시작 전에는 복습이 있을 수 없다(오답은 풀이 기록에서만 생긴다) — 첫 개념이 미션
        if let (course, concept) = next { return .firstConcept(course: course, concept: concept) }
        return .allDone   // 커리큘럼이 빈 방어 분기 — 현행 데이터에는 없다
    }
    if store.dueReviewCount > 0 {
        return .review(count: store.dueReviewCount, followUp: next)
    }
    if let (course, concept) = next {
        return .nextConcept(course: course, concept: concept)
    }
    return .allDone
}

/// 개념명 뒤 목적격 조사 — 마지막 한글 음절의 받침으로 을/를 을 고른다.
/// 괄호·기호로 끝나는 제목("순열 (줄 세우기)")은 읽히는 마지막 한글이 기준이다.
private func objectParticle(_ word: String) -> String {
    for scalar in word.unicodeScalars.reversed() where (0xAC00...0xD7A3).contains(scalar.value) {
        return (scalar.value - 0xAC00) % 28 == 0 ? "를" : "을"
    }
    return "을(를)"   // 한글이 아예 없는 제목 — 현행 커리큘럼 데이터에는 없다
}

/// 로그인 만료 배너 — 통계 섹션에서 분리한 화면 상단의 컴팩트 한 장.
/// 통계 헤더에 섞여 있던 만료 안내는 "내 기록이 날아갔나" 로 읽혔다 —
/// 데이터가 안전하다는 말이 먼저고, 출구는 "다시 로그인" 하나다.
/// 트리거는 종전 통계 헤더의 것과 같다(store.signOut → 인증 화면 복귀).
///
/// 크기는 일부러 죽인다 — 시스템 상태가 제품 가치(미션)보다 크게 서면 안 된다.
/// 전폭 노란 바 대신 미션 콘텐츠와 같은 컬럼에서 760pt 에 멈추고,
/// 세로 패딩 한 단계 축소 + warningSoft 틴트를 낮춰 화면의 첫인상을
/// 미션 히어로에게 돌려준다.
private struct SyncPausedBanner: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Tokens.Space.s3) {
                message
                Spacer(minLength: Tokens.Space.s3)
                loginButton
            }
            VStack(alignment: .leading, spacing: Tokens.Space.s1) {
                message
                loginButton
            }
        }
        .padding(.horizontal, Tokens.Space.s4)
        .padding(.vertical, Tokens.Space.s1)
        .background(Tokens.warningSoft.opacity(0.6),
                    in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
        .frame(maxWidth: 760, alignment: .leading)
    }

    private var message: some View {
        HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s2) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.mCaption)
                .accessibilityHidden(true)
            Text("동기화가 잠시 멈췄어요. 이 iPad의 기록은 안전합니다.")
                .font(.mCaption)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(Tokens.warningInk)
    }

    private var loginButton: some View {
        Button {
            store.signOut()
        } label: {
            HStack(spacing: 2) {
                Text("다시 로그인").font(.mCaption).fontWeight(.bold)
                Image(systemName: "chevron.right").font(.mMicro)
                    .accessibilityHidden(true)
            }
            .foregroundStyle(Tokens.warningInk)
            .frame(minHeight: 44)              // 최소 터치 타겟
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("다시 로그인")
    }
}

private enum DashboardActivitySource: Equatable {
    case local
    case syncing
    case server
    case unsupported
    case offline
    case expired
    case failed

    init(error: Error) {
        if let apiError = error as? ServerAPIError {
            if apiError.statusCode == 404 {
                self = .unsupported
                return
            }
            if apiError.statusCode == 401 {
                self = .expired
                return
            }
        }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost, .timedOut,
                 .cannotConnectToHost, .cannotFindHost, .dnsLookupFailed:
                self = .offline
            default:
                self = .failed
            }
            return
        }

        self = .failed
    }

    var message: String {
        switch self {
        case .local:
            return "이 iPad 기록"
        case .syncing:
            return "서버 기록 확인 중"
        case .server:
            return "서버 기록"
        case .unsupported:
            return "온라인 기록을 사용할 수 없어 이 iPad 기록을 표시합니다."
        case .offline:
            return "연결할 수 없어 이 iPad 기록을 표시합니다."
        case .expired:
            return "로그인이 만료되어 이 iPad 기록을 표시합니다."
        case .failed:
            return "서버 기록을 불러오지 못해 이 iPad 기록을 표시합니다."
        }
    }

    var icon: String {
        switch self {
        case .local:       return "ipad"
        case .syncing:     return "arrow.triangle.2.circlepath"
        case .server:      return "checkmark.circle.fill"
        case .unsupported: return "exclamationmark.circle"
        case .offline:     return "wifi.slash"
        case .expired:     return "person.crop.circle.badge.exclamationmark"
        case .failed:      return "exclamationmark.triangle"
        }
    }

    var tint: Color {
        switch self {
        case .server:                  return Tokens.success
        case .syncing:                 return Tokens.primary
        // 만료는 파괴적 오류가 아니라 복구 가능한 상태다 — danger 빨강의 의미를
        // 보존하려고 warning 으로 낮춘다 (0373·0276). 진짜 실패만 danger.
        case .unsupported, .offline, .expired: return Tokens.warning
        case .failed:                  return Tokens.danger
        case .local:                   return Tokens.text3
        }
    }
}

private enum LocalDashboardSnapshot {
    static func make(now: Date = Date()) -> ServerAPI.DashboardActivity {
        // JSONL을 한 번만 읽고 서버와 같은 KST 경계·반올림 규칙으로 집계한다.
        let local = EventLog.dashboardSnapshot(now: now)
        let days = local.days.map { day in
            ServerAPI.DashboardActivity.WeeklyActivity.Day(
                dateKey: day.dateKey,
                label: day.label,
                minutes: day.minutes,
                isToday: day.isToday)
        }

        return ServerAPI.DashboardActivity(
            generatedAt: ISO8601DateFormatter().string(from: local.generatedAt),
            stats: .init(
                weeklyStudyMinutes: local.weeklyStudyMinutes,
                weeklyStudyDetail: local.weeklyStudyDetail,
                todayStudyMinutes: local.todayStudyMinutes,
                activeStudyDays: local.activeStudyDays,
                averageStudyMinutes: local.averageStudyMinutes,
                weeklySolvedProblems: local.weeklySolvedProblems,
                weeklySolvedDetail: local.weeklySolvedDetail,
                correctRate: local.correctRate,
                correctRateDetail: local.correctRateDetail),
            weeklyActivity: .init(
                days: days,
                maxMinutes: local.maxMinutes))
    }
}

/// ② 미션 히어로 — 오늘 할 다음 행동 하나.
///
/// 판정은 홈이 내려주는 HomeMission — 제목(stateTitle)과 같은 축이다.
/// 밀린 복습이 있으면 카드 자체가 복습 미션이 되고 새 개념은 보조 행으로 내려간다 —
/// "복습부터 정리해요" 라는 제목 아래 주 CTA 가 새 개념을 미는 충돌 방지(회귀 R-02).
private struct MissionHeroCard: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    /// 홈이 판정해서 내려주는 오늘의 미션 — stateTitle 과 같은 값이다.
    let mission: HomeMission

    /// 과목 진도 — 완료 개념 수 / 전체. 히어로 진행바는 이 실데이터만 쓴다.
    private func progress(in course: CourseV2) -> Double {
        Double(store.progressV2.coursePercent(course)) / 100
    }

    /// 과목에 남은 미완료 개념 수 — "남은 양" 표기의 근거
    private func remaining(in course: CourseV2) -> Int {
        course.allConcepts.filter { store.progressV2.percent(for: $0) < 100 }.count
    }

    /// 다음 개념의 예상 소요 시간(분) — 미션과 같은 v2 강의 메타만 사용한다.
    private func estimatedMinutes(for concept: ConceptV2) -> Int? {
        concept.lesson?.estimatedMinutes ?? 15
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            switch mission {
            case let .review(count, followUp):
                reviewMission(count: count, followUp: followUp)
            case let .firstConcept(course, concept):
                conceptMission(course: course, concept: concept, preStart: true)
            case let .nextConcept(course, concept):
                conceptMission(course: course, concept: concept, preStart: false)
            case .allDone:
                allDone
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    /// 복습 미션 — 건수·예상 시간·시작 경로 전부 오답노트와 같은 근거를 쓴다:
    /// 문항당 4분은 복습 문항 복원(WrongNoteEntry.asProblem)의 minutes 와 같은 값,
    /// 시작 세트는 due 전체(WrongNotesScreen 히어로의 startReview 호출과 동일)다.
    @ViewBuilder private func reviewMission(
        count: Int, followUp: (course: CourseV2, concept: ConceptV2)?
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text("오늘의 미션 · 오답 복습")
                .font(.mMicro).foregroundStyle(Tokens.text3)
            Text("오늘 복습 \(count)개")
                .font(.mHeading).foregroundStyle(Tokens.ink)
                .monospacedDigit()
                .accessibilityAddTraits(.isHeader)
            Text("틀렸던 바로 그 문제를 그대로 다시 풉니다.")
                .font(.mCallout).foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
            Text("예상 약 \(count * 4)분")
                .font(.mCaption).foregroundStyle(Tokens.text2)
                .monospacedDigit()
        }

        // 이 화면의 유일한 주 버튼 — 제목("복습부터 정리해요")과 같은 곳을 가리킨다
        Button("복습 시작") {
            store.startReview(ids: store.wrongNotes.filter(\.isDue).map(\.id))
        }
        .buttonStyle(PrimaryButtonStyle())
        .frame(maxWidth: 300, alignment: .leading)
        .accessibilityLabel("복습 시작, 오늘 복습 \(count)개")

        // 새 개념은 보조 행으로 강등 — 주 CTA 와 경쟁하지 않는 평문 링크 문법.
        // 문구는 동작 그대로 말한다: 누르면 복습을 건너뛰고 즉시 개념으로 간다.
        // "복습 후 이어갈" 은 순서를 약속하는 거짓말이었다(RG-03 — 동작 변경 없음).
        if let (_, concept) = followUp {
            Button {
                store.openConceptV2(concept.id)
            } label: {
                HStack(spacing: Tokens.Space.s2) {
                    Text("새 개념으로 바로 가기 · \(concept.title)")
                        .font(.mCaption).foregroundStyle(Tokens.text2)
                        .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                        .minimumScaleFactor(dynamicTypeSize.isAccessibilitySize ? 1 : 0.8)
                        .fixedSize(horizontal: false, vertical: true)
                    Image(systemName: "chevron.right")
                        .font(.mMicro).foregroundStyle(Tokens.text4)
                }
                .frame(minHeight: 44)          // 평문이어도 터치 타겟은 지킨다
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("새 개념으로 바로 가기, \(concept.title)")
        }
    }

    /// 개념 미션 — preStart 는 개념 판정 축과 목적지를 그대로 두고,
    /// "이어서" 를 "오늘 시작할 첫 미션" 으로 프레이밍만 바꾼다.
    @ViewBuilder private func conceptMission(
        course: CourseV2, concept: ConceptV2, preStart: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text((preStart ? "오늘의 첫 미션" : "오늘의 미션") + " · \(course.title)")
                .font(.mMicro).foregroundStyle(Tokens.text3)
            Text(concept.title)
                .font(.mHeading).foregroundStyle(Tokens.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(concept.lesson?.summary ?? concept.achievementStandard ?? "개념 학습을 시작합니다.")
                .font(.mCallout).foregroundStyle(Tokens.text2)
                .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 2)
                .fixedSize(horizontal: false, vertical: true)
            missionMeta(course: course, concept: concept, preStart: preStart)
        }

        // 시작 전에는 0% 진행바를 걸지 않는다 — 빈 막대는 "지금 시작" 을
        // "아직 없음" 으로 되돌려 읽게 만든다
        if !preStart {
            ProgressBar(value: progress(in: course))
                .frame(maxWidth: 340)
        }

        // 이 화면의 유일한 주 버튼 — 솔리드 바이올렛 + 하드 엣지 (PrimaryButtonStyle).
        // 카드 전폭이 아니라 300pt 에서 멈춘다: iPad 폭에서 전폭 CTA 는
        // 버튼이 아니라 구획 배경처럼 읽힌다. 본문과 같은 leading 정렬.
        Button(preStart ? "지금 시작하기" : "이어서 풀기") { store.openConceptV2(concept.id) }
            .buttonStyle(PrimaryButtonStyle())
            .frame(maxWidth: 300, alignment: .leading)
            .accessibilityLabel("\(preStart ? "지금 시작하기" : "이어서 풀기"), \(concept.title)")
    }

    /// 전 과목 완료 — 죽은 문장 대신 다음 행동을 준다
    @ViewBuilder private var allDone: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Text("이어서 학습")
                .font(.mMicro).foregroundStyle(Tokens.text3)
            Text("모든 개념을 완료했습니다")
                .font(.mHeading).foregroundStyle(Tokens.ink)
                .accessibilityAddTraits(.isHeader)
            Text("커리큘럼에서 복습할 개념을 고르거나 평가로 실력을 확인해 보세요.")
                .font(.mCallout).foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }

        Button("커리큘럼 보기") { store.route = .curriculum }
            .buttonStyle(PrimaryButtonStyle())
            .frame(maxWidth: 300, alignment: .leading)   // 주 CTA 와 같은 폭 규칙
    }

    /// 미션의 크기 한 줄 — 예상 시간과 남은 양. 크기를 먼저 보여야 시작 부담이 준다.
    private func missionMeta(course: CourseV2, concept: ConceptV2, preStart: Bool) -> some View {
        let minutes = estimatedMinutes(for: concept)
        let text: String
        if preStart {
            text = minutes.map { "예상 약 \($0)분" } ?? "오늘 첫 개념부터 시작합니다"
        } else {
            let left = "남은 개념 \(remaining(in: course))개"
            text = minutes.map { "예상 약 \($0)분 · \(left)" } ?? left
        }
        return Text(text)
            .font(.mCaption).foregroundStyle(Tokens.text2)
            .monospacedDigit()
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// ③-a 이번 주 학습 — 괘선 섹션 + 핵심 3지표 + 주간 차트.
///
/// 예전 6칸 동일 그리드는 지표끼리 서열이 없어 아무것도 안 읽혔다.
/// 학습시간·학습한 날·정답률 셋만 남기고 나머지는 각 목적지 화면이 맡는다.
/// 카드 chrome 은 벗겼다 — 통계는 행동 위계가 필요 없는 받침 정보라
/// 시험지 괘선 문법(섹션 제목 + 선)의 평면 섹션으로 내려가고,
/// 홈의 흰 카드는 미션 히어로 하나만 남는다.
/// 데이터 출처 상태(서버/로컬 …)는 mMicro 로 우상단에 붙인다.
/// 로그인 만료 안내는 여기 없다 — 화면 상단의 SyncPausedBanner 가 맡는다.
private struct WeeklyStudySection: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let activity: ServerAPI.DashboardActivity
    let source: DashboardActivitySource
    /// .failed/.offline 의 "다시 시도" — 홈 화면의 기존 재조회를 그대로 트리거한다
    let onRetry: () -> Void

    /// 요일별 학습 시간이 하나도 없으면 0 높이 막대 일곱 개를 그리지 않는다.
    /// 문제 풀이 건수와 시간 집계는 서로 다른 신호이므로, 풀이가 있어도 모든
    /// minute 값이 0이면 시간 차트 대신 상태 문장을 보여 준다.
    private var hasChartData: Bool {
        activity.weeklyActivity.days.contains { $0.minutes > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            header
            statRow
            if hasChartData {
                WeeklyActivityChart(activity: activity.weeklyActivity)
            } else {
                chartForecast
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// SectionRule 문법(제목 + 괘선)에 출처 상태를 오른쪽 끝에 얹은 변형
    private var header: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                    Text("이번 주 학습")
                        .font(.mCaption).foregroundStyle(Tokens.text3)
                        .accessibilityAddTraits(.isHeader)
                    status
                }
            } else {
                HStack(spacing: Tokens.Space.s3) {
                    Text("이번 주 학습")
                        .font(.mCaption).foregroundStyle(Tokens.text3)
                        .layoutPriority(1)
                        .accessibilityAddTraits(.isHeader)
                    Rectangle().fill(Tokens.line).frame(height: 1)
                        .accessibilityHidden(true)
                    status
                }
            }
        }
    }

    /// 출처 상태 — 읽기 전용 상태는 한 줄 텍스트, 실패·오프라인은 그 자리에서 바로
    /// 고칠 수 있는 버튼이다 (1116·0373 — 문제만 말하고 출구를 안 주지 않는다).
    /// 만료만 예외다: 안내와 "다시 로그인" 이 상단 배너로 올라갔으므로 여기서는
    /// 지금 보이는 데이터의 출처(이 iPad 기록)만 말한다 — 같은 말 두 번 하지 않는다.
    @ViewBuilder private var status: some View {
        switch source {
        case .expired:
            statusLine(.local)
        case .failed, .offline:
            statusAction("다시 시도") { onRetry() }
        default:
            statusLine(source)
        }
    }

    private func statusLine(_ shown: DashboardActivitySource) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s1) {
            if shown == .syncing {
                ProgressView()
                    .controlSize(.small)
                    .tint(shown.tint)
                    .accessibilityHidden(true)
            } else {
                Image(systemName: shown.icon)
                    .accessibilityHidden(true)
            }
            Text(shown.message)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
        }
        .font(.mMicro)
        .foregroundStyle(shown.tint)
        .frame(maxWidth: 220, alignment: .trailing)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(shown.message)
    }

    /// 상태 문구 + 행동 한 줄 — 기존 문구는 그대로 두고 아래에 행동 레이블을 붙인다.
    private func statusAction(_ actionTitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .trailing, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s1) {
                    Image(systemName: source.icon)
                        .accessibilityHidden(true)
                    Text(source.message)
                        .multilineTextAlignment(.trailing)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: 2) {
                    Text(actionTitle).fontWeight(.bold)
                    Image(systemName: "chevron.right")
                        .accessibilityHidden(true)
                }
            }
            .font(.mMicro)
            .foregroundStyle(source.tint)
            .frame(maxWidth: 220, alignment: .trailing)
            .frame(minHeight: 44)              // 최소 터치 타겟 (1261)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(source.message) \(actionTitle)")
    }

    /// 3지표 — 넓으면 한 줄 세 칸, 좁으면(320pt·접근성 글씨) 세로로 푼다.
    private var statRow: some View {
        let stats = activity.stats
        // 이번 주 풀이가 0건이면 정답률은 "0%(전부 틀림)" 가 아니라 측정값 없음이다 (1380).
        let noSolves = stats.weeklySolvedProblems == 0
        let rateValue = noSolves ? "—" : "\(stats.correctRate)%"
        let rateDetail = noSolves ? "이번 주 풀이 기록 없음" : stats.correctRateDetail
        return Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    stat("이번 주 학습시간", Self.formatStudyTime(stats.weeklyStudyMinutes),
                         detail: stats.weeklyStudyDetail)
                    stat("학습한 날", "\(stats.activeStudyDays)/7일", detail: "최근 7일 중")
                    stat("정답률", rateValue, detail: rateDetail)
                }
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .top, spacing: Tokens.Space.s4) {
                        stat("이번 주 학습시간", Self.formatStudyTime(stats.weeklyStudyMinutes),
                             detail: stats.weeklyStudyDetail)
                        statDivider
                        stat("학습한 날", "\(stats.activeStudyDays)/7일", detail: "최근 7일 중")
                        statDivider
                        stat("정답률", rateValue, detail: rateDetail)
                    }

                    VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                        stat("이번 주 학습시간", Self.formatStudyTime(stats.weeklyStudyMinutes),
                             detail: stats.weeklyStudyDetail)
                        stat("학습한 날", "\(stats.activeStudyDays)/7일", detail: "최근 7일 중")
                        stat("정답률", rateValue, detail: rateDetail)
                    }
                }
            }
        }
    }

    private func stat(_ title: String, _ value: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(.mMicro).foregroundStyle(Tokens.text3)
            Text(value).font(.mStat).foregroundStyle(Tokens.ink).monospacedDigit()
            // detail 은 장식이 아니라 데이터(증감 추이)다 — text4 는 대비 미달 (0409·0410)
            // 빈 문구는 줄 자체를 접는다 — 이번 주 0 인 지표에 감소 강조를
            // 붙이지 않는 EventLog 의 판정(RG-04)과 같은 축이다.
            if !detail.isEmpty {
                Text(detail).font(.mMicro).foregroundStyle(Tokens.text3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(statAccessibilityLabel(title: title, value: value, detail: detail))
    }

    /// "—" 는 음성으로 읽히지 않는다 — 측정 없음은 말로 풀어 주고,
    /// 접힌 delta 줄(빈 문구)은 음성에서도 읽지 않는다.
    private func statAccessibilityLabel(title: String, value: String, detail: String) -> String {
        let base = value == "—" ? title : "\(title) \(value)"
        return detail.isEmpty ? base : "\(base), \(detail)"
    }

    private var statDivider: some View {
        Rectangle().fill(Tokens.line)
            .frame(width: 1, height: 44)
            .accessibilityHidden(true)
    }

    /// 빈 상태 — 골격 막대를 그리지 않는다: 희미한 가짜 막대는 잠깐이라도 기록처럼
    /// 읽힌다. 무엇이 올지 한 줄로 예고만 한다. 시작 CTA 는 바로 위 히어로 몫이다.
    private var chartForecast: some View {
        Text(activity.stats.weeklySolvedProblems > 0
             ? "이번 주 \(activity.stats.weeklySolvedProblems)문제를 풀었어요. 학습 시간이 기록되면 요일별 패턴을 보여드려요."
             : "3일 학습하면 주간 패턴을 분석해 드려요")
            .font(.mCallout)
            .foregroundStyle(Tokens.text3)
            .fixedSize(horizontal: false, vertical: true)
    }

    private static func formatStudyTime(_ minutes: Int) -> String {
        let safeMinutes = max(0, minutes)
        let hours = safeMinutes / 60
        let remaining = safeMinutes % 60
        if hours == 0 { return "\(remaining)분" }
        if remaining == 0 { return "\(hours)시간" }
        return "\(hours)시간 \(remaining)분"
    }
}

/// ③-b GOAT Arena 예고 — 이 화면의 유일한 네이비 면.
///
/// 네이비 위 강조색은 시안 하나만 쓴다(네이비 위 마젠타·바이올렛 금지).
/// 층은 navyElevated 로만 세운다. 다크 모드에서는 페이지 바탕(paper)이 네이비와
/// 같은 색이라 카드 경계는 테두리 선이 세운다.
private struct ArenaTeaserCard: View {
    @EnvironmentObject private var store: AppStore

    private var onNavy: Color { Tokens.onNavy }

    var body: some View {
        Button {
            store.route = .rank
        } label: {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Tokens.Space.s5) {
                    titleBlock
                    Spacer(minLength: Tokens.Space.s4)
                    enterChip
                }
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    titleBlock
                    enterChip
                }
            }
            .padding(Tokens.Space.s6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                ArenaArtworkBackground(
                    imageName: "ArenaHeroBackdrop",
                    focalAlignment: .trailing,
                    darkening: 0.18)
                    .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.xl))
            }
            .overlay {
                RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                    .strokeBorder(Tokens.brandCyan.opacity(0.28), lineWidth: 1)
            }
            .contentShape(RoundedRectangle(cornerRadius: Tokens.Radius.xl))
        }
        .buttonStyle(PressScaleStyle())
        .accessibilityLabel("GOAT Arena. 매일 출석으로 내 자리를 지키는 30일 서바이벌. GOAT Arena 열기")
    }

    /// 맵 화면과 같은 라운디드 헤비 — 큰 제목의 장난기는 서체로만 낸다
    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            Label("GOAT Arena 입장", systemImage: "crown.fill")
                .font(.mMicro)
                .foregroundStyle(Tokens.brandCyan)
            Text("GOAT ARENA")
                .font(.mTitle)
                .fontDesign(.rounded)
                .foregroundStyle(onNavy)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("매일 출석으로 내 자리를 지키는 30일 서바이벌")
                .font(.mCallout)
                .foregroundStyle(onNavy.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// 네이비 위 유일한 강조 — 시안 화살표 칩 (navyElevated 층 위)
    private var enterChip: some View {
        HStack(spacing: Tokens.Space.s2) {
            Text("입장").font(.mCaption)
            Image(systemName: "chevron.right").font(.mCaption)
        }
        .foregroundStyle(Tokens.brandCyan)
        .padding(.horizontal, Tokens.Space.s4)
        .frame(minHeight: 44)
        .background(Tokens.navyElevated, in: Capsule())
        .accessibilityHidden(true)      // 카드 전체가 버튼 — 라벨은 카드에 있다
    }
}

private struct WeeklyActivityChart: View {
    let activity: ServerAPI.DashboardActivity.WeeklyActivity

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    private var days: [ServerAPI.DashboardActivity.WeeklyActivity.Day] {
        var result = Array(activity.days.prefix(7))
        let fallbackLabels = EventLog.recentDayLabels()
        while result.count < 7 {
            let index = result.count
            result.append(.init(
                dateKey: "missing-\(index)",
                label: fallbackLabels.indices.contains(index) ? fallbackLabels[index] : "—",
                minutes: 0,
                isToday: index == 6))
        }
        return result
    }

    private var maximum: Int {
        max(1, activity.maxMinutes, days.map(\.minutes).max() ?? 0)
    }

    /// 받침 카드로 내려오면서 더 촘촘하게 — 116→88 (접근성 글씨는 150→128)
    private var trackHeight: CGFloat {
        dynamicTypeSize.isAccessibilitySize ? 128 : 88
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            HStack(spacing: Tokens.Space.s2) {
                Circle()
                    .fill(Tokens.primary)
                    .frame(width: 7, height: 7)
                    .accessibilityHidden(true)
                Text("학습 시간")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text3)
            }

            HStack(alignment: .bottom, spacing: 3) {
                ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                    chartDay(day, index: index)
                }
            }
            // 7개 축을 한 줄로 유지하는 시각화라 접근성 배율을 그대로 적용하면
            // 서로 겹친다. 각 막대의 전체 값은 아래 accessibilityLabel로 제공한다.
            .dynamicTypeSize(.large)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("요일별 학습 시간")
    }

    private func chartDay(
        _ day: ServerAPI.DashboardActivity.WeeklyActivity.Day,
        index: Int
    ) -> some View {
        let minutes = max(0, day.minutes)
        let ratio = minutes == 0
            ? 0
            : max(0.07, min(1, Double(minutes) / Double(maximum)))

        return VStack(spacing: Tokens.Space.s2) {
            // 접근성 글씨 크기에서도 7열을 유지하려면 단위는 범례·VoiceOver에 맡기고
            // 숫자만 표시한다. 일반 크기에서는 웹과 같은 "42분" 표기다.
            Text(dynamicTypeSize.isAccessibilitySize ? "\(minutes)" : "\(minutes)분")
                .font(.mMicro)
                .foregroundStyle(Tokens.text3)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.65)

            ZStack(alignment: .bottom) {
                chartGrid

                if ratio > 0 {
                    // 단일 시리즈(학습 시간)는 단색이다 — 요일별 브랜드 색 로테이션은
                    // 카테고리 차이처럼 오독되고 범례 점(primary)과도 어긋난다 (0401·0415).
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Tokens.primary)
                        .frame(maxWidth: 28)
                        .frame(height: trackHeight * ratio)
                }
            }
            .frame(height: trackHeight)

            Text(day.label)
                .font(.mCaption)
                .foregroundStyle(day.isToday ? Tokens.ink : Tokens.text3)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(day.label), \(minutes)분\(day.isToday ? ", 오늘" : "")")
    }

    private var chartGrid: some View {
        VStack(spacing: 0) {
            ForEach(0..<4, id: \.self) { index in
                Rectangle()
                    .fill(index == 3 ? Tokens.lineStrong : Tokens.line)
                    .frame(height: index == 3 ? 1 : 0.5)
                if index < 3 { Spacer(minLength: 0) }
            }
        }
        .accessibilityHidden(true)
    }

}

#if DEBUG
private enum DashboardFixture {
    static var current: String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-dashboardFixture"),
              arguments.indices.contains(index + 1) else { return nil }
        let value = arguments[index + 1].lowercased()
        return ["active", "zero", "failure"].contains(value) ? value : nil
    }

    static let active = ServerAPI.DashboardActivity(
        generatedAt: "2026-07-30T09:30:00.000Z",
        stats: .init(
            weeklyStudyMinutes: 315,
            weeklyStudyDetail: "지난주보다 85분 늘었어요",
            todayStudyMinutes: 42,
            activeStudyDays: 5,
            averageStudyMinutes: 63,
            weeklySolvedProblems: 128,
            weeklySolvedDetail: "개념·복습 문제",
            correctRate: 84,
            correctRateDetail: "지난주보다 6% 늘었어요"),
        weeklyActivity: .init(
            days: zip(
                ["금", "토", "일", "월", "화", "수", "오늘"],
                [24, 0, 58, 75, 46, 70, 42]
            ).enumerated().map { index, value in
                .init(
                    dateKey: "fixture-\(index)",
                    label: value.0,
                    minutes: value.1,
                    isToday: index == 6)
            },
            maxMinutes: 75))

    static let zero = ServerAPI.DashboardActivity(
        generatedAt: "2026-07-30T09:30:00.000Z",
        stats: .init(
            weeklyStudyMinutes: 0,
            weeklyStudyDetail: "지난주와 같아요",
            todayStudyMinutes: 0,
            activeStudyDays: 0,
            averageStudyMinutes: 0,
            weeklySolvedProblems: 0,
            weeklySolvedDetail: "개념·복습 문제",
            correctRate: 0,
            correctRateDetail: "지난주와 같아요"),
        weeklyActivity: .init(
            days: ["금", "토", "일", "월", "화", "수", "오늘"].enumerated().map {
                .init(
                    dateKey: "fixture-\($0.offset)",
                    label: $0.element,
                    minutes: 0,
                    isToday: $0.offset == 6)
            },
            maxMinutes: 10))
}
#endif
