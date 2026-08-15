import SafariServices
import SwiftUI

struct CommerceHubScreen: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var storefront: ServerAPI.CommerceStorefront?
    @State private var loading = true
    @State private var openingDestination: String?
    @State private var errorMessage: String?
    @State private var browser: CommerceBrowserDestination?
    @State private var requestID = UUID()
    @State private var accountSlot = DataScope.slot

    private var compact: Bool { horizontalSizeClass == .compact }
    private var requiresLogin: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-commerceFixture") { return false }
        #endif
        return store.authProvider != "server"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Tokens.Space.s8) {
                    heading
                    walletBoundary

                    if requiresLogin {
                        loginRequired
                    } else if loading {
                        loadingView
                    } else if let storefront {
                        accessSummary(storefront.access)
                        productSection(storefront)
                        rankedShopSection(storefront.access)
                    } else if let errorMessage {
                        unavailable(errorMessage)
                    }
                }
                .frame(maxWidth: Tokens.readableWidth, alignment: .leading)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, compact ? Tokens.Space.s4 : Tokens.Space.s8)
                .padding(.vertical, Tokens.Space.s6)
            }
            .background(Tokens.paper)
            .navigationTitle("이용권과 상점")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("이전") { store.route = .profile }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Task { await load() } } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(loading || openingDestination != nil || requiresLogin)
                    .accessibilityLabel("이용 상태 새로고침")
                }
            }
            .task { await load() }
            .onReceive(NotificationCenter.default.publisher(for: DataScope.didSwitchNotification)) {
                guard let newSlot = $0.object as? String, newSlot != accountSlot else { return }
                accountSlot = newSlot
                requestID = UUID()
                storefront = nil
                browser = nil
                errorMessage = nil
                Task { await load() }
            }
            .sheet(item: $browser, onDismiss: {
                Task { await load() }
            }) { destination in
                CommerceSafariView(url: destination.url)
                    .ignoresSafeArea()
            }
        }
    }

    private var heading: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s3) {
            Text("결제와 경기 자산을 한곳에서 확인합니다")
                .font(.mMicro)
                .foregroundStyle(Tokens.primary)
            Text("이용권과 Ranked 상점은\n서로 다른 지갑입니다.")
                .font(.mTitle)
                .foregroundStyle(Tokens.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text("원화 결제는 웹의 안전한 결제 화면에서 진행하고, Ranked 상점은 학습일만 사용합니다.")
                .font(.mBody)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var walletBoundary: some View {
        VStack(spacing: 0) {
            boundaryRow(
                icon: "creditcard",
                title: "기간 이용권",
                detail: "원화 · 29일 또는 30일",
                tint: Tokens.primary)
            DottedRule()
            boundaryRow(
                icon: "calendar.badge.clock",
                title: "Ranked 상점",
                detail: "학습일 · 경기 분석과 일정 편의",
                tint: Tokens.successInk)
        }
        .card()
        .accessibilityElement(children: .contain)
    }

    private func boundaryRow(icon: String, title: String, detail: String, tint: Color) -> some View {
        HStack(spacing: Tokens.Space.s4) {
            Image(systemName: icon)
                .font(.mHeading)
                .foregroundStyle(tint)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.mBodyB).foregroundStyle(Tokens.ink)
                Text(detail).font(.mCaption).foregroundStyle(Tokens.text3)
            }
            Spacer(minLength: Tokens.Space.s3)
        }
        .frame(minHeight: 58)
    }

    private func accessSummary(_ access: ServerAPI.CommerceStorefront.Access) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            SectionRule(title: "현재 이용 상태")
            accessLine(
                "29일 학습 패키지",
                active: access.learningPackageActive,
                detail: access.learningPackageActive ? "학습과 공식 Arena 이용 중" : "이용 중인 패키지 없음")
            DottedRule()
            accessLine(
                "30일 모의고사 이용권",
                active: access.mockExamPackageActive,
                detail: access.mockExamPackageActive ? mockExamEndLine(access.mockExamEndsAt) : "이용 중인 이용권 없음")
        }
        .card()
    }

    private func accessLine(_ title: String, active: Bool, detail: String) -> some View {
        HStack(alignment: .top, spacing: Tokens.Space.s4) {
            Image(systemName: active ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(active ? Tokens.successInk : Tokens.text4)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.mBodyB).foregroundStyle(Tokens.ink)
                Text(detail).font(.mCaption).foregroundStyle(Tokens.text3)
            }
            Spacer(minLength: Tokens.Space.s3)
            Text(active ? "이용 중" : "미이용")
                .font(.mMicro)
                .foregroundStyle(active ? Tokens.successInk : Tokens.text3)
        }
    }

    private func productSection(_ value: ServerAPI.CommerceStorefront) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            VStack(alignment: .leading, spacing: 3) {
                SectionRule(title: "기간 이용권")
                Text("결제 수단과 약관은 브라우저에서 최종 확인합니다.")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.text3)
            }

            ForEach(value.products) { product in
                productRow(product, checkoutEnabled: value.checkoutEnabled)
            }

            #if DEBUG
            Button {
                Task { await openHandoff(mode: "pricing") }
            } label: {
                Label(openingDestination == "pricing" ? "여는 중" : "이용권 전체 설명 보기",
                      systemImage: "safari")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SecondaryButtonStyle())
            .disabled(openingDestination != nil)
            #endif
        }
    }

    private func productRow(
        _ product: ServerAPI.CommerceStorefront.Product,
        checkoutEnabled: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(product.name).font(.mHeading).foregroundStyle(Tokens.ink)
                    Text(product.periodLabel).font(.mCaption).foregroundStyle(Tokens.text3)
                }
                Spacer(minLength: Tokens.Space.s3)
                Text(formattedKRW(product.amount))
                    .font(.mHeading)
                    .foregroundStyle(Tokens.ink)
            }

            Text(product.description)
                .font(.mBody)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                ForEach(product.features, id: \.self) { feature in
                    Label(feature, systemImage: "checkmark")
                        .font(.mCaption)
                        .foregroundStyle(Tokens.text2)
                }
            }

            if product.current {
                Label("현재 이용 중", systemImage: "checkmark.seal.fill")
                    .font(.mBodyB)
                    .foregroundStyle(Tokens.successInk)
                    .frame(minHeight: 44)
            }

            #if DEBUG
            if checkoutEnabled {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: Tokens.Space.s3) {
                        checkoutButton("본인 결제", product: product, mode: "self", primary: true)
                        checkoutButton("부모님께 요청", product: product, mode: "parent-request", primary: false)
                    }
                    VStack(spacing: Tokens.Space.s3) {
                        checkoutButton("본인 결제", product: product, mode: "self", primary: true)
                        checkoutButton("부모님께 요청", product: product, mode: "parent-request", primary: false)
                    }
                }
            } else {
                Text("결제 준비 중 · 가격과 이용 범위만 확인할 수 있습니다.")
                    .font(.mCaption)
                    .foregroundStyle(Tokens.warningInk)
            }
            #else
            Text("App Store 배포 전 결제 정책 검토가 완료되면 앱 결제를 엽니다.")
                .font(.mCaption)
                .foregroundStyle(Tokens.text3)
            #endif
        }
        .card()
    }

    @ViewBuilder
    private func checkoutButton(
        _ label: String,
        product: ServerAPI.CommerceStorefront.Product,
        mode: String,
        primary: Bool
    ) -> some View {
        let destination = "\(product.code):\(mode)"
        if primary {
            Button {
                Task { await openHandoff(productCode: product.code, mode: mode) }
            } label: {
                Text(openingDestination == destination ? "여는 중" : label)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(openingDestination != nil)
        } else {
            Button {
                Task { await openHandoff(productCode: product.code, mode: mode) }
            } label: {
                Text(openingDestination == destination ? "여는 중" : label)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SecondaryButtonStyle())
            .disabled(openingDestination != nil)
        }
    }

    private func rankedShopSection(_ access: ServerAPI.CommerceStorefront.Access) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s5) {
            SectionRule(title: "Ranked 상점")
            Text("현금 결제가 아닙니다. 서버가 확정한 학습일 잔액과 현재 사이클 조건만 사용합니다.")
                .font(.mBody)
                .foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                Label("경기 상세 분석", systemImage: "chart.xyaxis.line")
                Label("경기 일정 편의", systemImage: "calendar.badge.clock")
                Label("시즌 장식과 활성 효과", systemImage: "sparkles")
            }
            .font(.mCaption)
            .foregroundStyle(Tokens.text2)

            if access.rankedShopAvailable {
                Button {
                    store.route = .arenaShop
                } label: {
                    Label("Ranked 상점 열기", systemImage: "bag.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .accessibilityHint("학습일로 이용하는 Ranked 전용 기능을 엽니다")
            } else {
                Button {
                    store.route = .rank
                } label: {
                    Label("GOAT Arena에서 이용 조건 확인", systemImage: "lock.open.display")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryButtonStyle())
                .accessibilityHint("현재 사이클과 이용권 상태를 확인합니다")
            }
        }
        .card()
    }

    private var loginRequired: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            Label("로그인이 필요합니다", systemImage: "person.crop.circle.badge.exclamationmark")
                .font(.mHeading)
                .foregroundStyle(Tokens.ink)
            Text("구매 내역과 학습일 잔액은 계정 소유 정보라 로그인 뒤 확인합니다.")
                .font(.mBody)
                .foregroundStyle(Tokens.text2)
            Button("로그인하기") { store.signOut() }
                .buttonStyle(PrimaryButtonStyle())
        }
        .card()
    }

    private var loadingView: some View {
        HStack(spacing: Tokens.Space.s3) {
            ProgressView()
            Text("이용 상태를 확인하고 있습니다.")
                .font(.mBody)
                .foregroundStyle(Tokens.text2)
        }
        .frame(minHeight: 72)
        .accessibilityElement(children: .combine)
    }

    private func unavailable(_ message: String) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s4) {
            Label("이용권 정보를 불러오지 못했습니다", systemImage: "exclamationmark.triangle.fill")
                .font(.mHeading)
                .foregroundStyle(Tokens.warningInk)
            Text(message).font(.mBody).foregroundStyle(Tokens.text2)
            Button("다시 확인") { Task { await load() } }
                .buttonStyle(SecondaryButtonStyle())
        }
        .card()
    }

    @MainActor
    private func load() async {
        let id = UUID()
        requestID = id
        let slot = DataScope.slot
        accountSlot = slot
        loading = true
        errorMessage = nil

        #if DEBUG
        if applyDebugFixtureIfPresent() {
            loading = false
            return
        }
        #endif

        guard store.authProvider == "server" else {
            storefront = nil
            loading = false
            return
        }
        do {
            let value = try await ServerAPI.getCommerceStorefront()
            guard requestID == id, DataScope.slot == slot else { return }
            storefront = value
        } catch {
            guard requestID == id, DataScope.slot == slot else { return }
            storefront = nil
            errorMessage = commerceReadableError(error)
        }
        guard requestID == id, DataScope.slot == slot else { return }
        loading = false
    }

    @MainActor
    private func openHandoff(productCode: String? = nil, mode: String) async {
        let destination = productCode.map { "\($0):\(mode)" } ?? mode
        openingDestination = destination
        errorMessage = nil
        defer { openingDestination = nil }
        do {
            let handoff = try await ServerAPI.createCommerceHandoff(
                productCode: productCode, mode: mode)
            guard let url = validatedCommerceURL(handoff.url) else {
                throw ServerAPIError(
                    message: "결제 주소의 안전성을 확인할 수 없습니다.",
                    code: "INVALID_COMMERCE_URL")
            }
            browser = CommerceBrowserDestination(url: url)
        } catch {
            errorMessage = commerceReadableError(error)
        }
    }

    private func validatedCommerceURL(_ value: String) -> URL? {
        guard let url = URL(string: value),
              url.scheme == "https",
              url.host?.lowercased() == ServerAPI.baseURL.host?.lowercased(),
              url.path.hasPrefix("/app/commerce/") else { return nil }
        return url
    }

    private func formattedKRW(_ amount: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return "\(formatter.string(from: NSNumber(value: amount)) ?? String(amount))원"
    }

    private func mockExamEndLine(_ value: String?) -> String {
        guard let value, !value.isEmpty else { return "이용 중" }
        return "만료 시각 · \(String(value.prefix(10)))"
    }

    #if DEBUG
    @MainActor
    private func applyDebugFixtureIfPresent() -> Bool {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-commerceFixture"),
              arguments.indices.contains(index + 1) else { return false }
        let fixture = arguments[index + 1].lowercased()
        switch fixture {
        case "active":
            storefront = CommerceHubFixture.make(active: true, checkoutEnabled: true)
        case "open":
            storefront = CommerceHubFixture.make(active: false, checkoutEnabled: true)
        case "closed":
            storefront = CommerceHubFixture.make(active: false, checkoutEnabled: false)
        case "failure":
            storefront = nil
            errorMessage = "서버 연결을 확인한 뒤 다시 시도해 주세요."
        default:
            return false
        }
        return true
    }
    #endif
}

private struct CommerceBrowserDestination: Identifiable {
    let id = UUID()
    let url: URL
}

private struct CommerceSafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.dismissButtonStyle = .close
        return controller
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

private func commerceReadableError(_ error: Error) -> String {
    if error is DecodingError {
        return "이용권 정보를 읽지 못했습니다. 앱을 최신 버전으로 업데이트해 주세요."
    }
    if let apiError = error as? ServerAPIError,
       let message = apiError.message, !message.isEmpty {
        return message
    }
    if error is URLError {
        return "인터넷 연결을 확인한 뒤 다시 시도해 주세요."
    }
    return "잠시 후 다시 시도해 주세요."
}

#if DEBUG
private enum CommerceHubFixture {
    static func make(active: Bool, checkoutEnabled: Bool) -> ServerAPI.CommerceStorefront {
        ServerAPI.CommerceStorefront(
            generatedAt: "2026-08-15T00:00:00.000Z",
            checkoutEnabled: checkoutEnabled,
            currency: "KRW",
            access: .init(
                packageType: active ? "LEARNING_PACKAGE_29" : nil,
                learningPackageActive: active,
                mockExamPackageActive: false,
                arenaAllowed: active,
                rankedShopAvailable: active,
                mockExamEndsAt: nil),
            products: [
                .init(
                    code: "LEARNING_PACKAGE_29",
                    name: "29일 학습 패키지",
                    amount: 29_000,
                    periodLabel: "29일",
                    description: "학습 사이클과 GOAT Arena 공식 경기를 함께 이용합니다.",
                    features: ["모의고사와 배치고사", "GOAT Arena 공식 경기", "29일 학습 사이클"],
                    current: active),
                .init(
                    code: "MOCK_EXAM_ONLY",
                    name: "모의고사 이용권",
                    amount: 9_900,
                    periodLabel: "30일",
                    description: "주간 공식 모의고사와 응시 기록을 확인합니다.",
                    features: ["주간 공식 모의고사", "응시 기록과 성적 확인", "30일 이용"],
                    current: false),
            ])
    }
}
#endif
