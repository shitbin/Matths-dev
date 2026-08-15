//  AuthScreen.swift
//  Matths
//
//  로그인 — 서버 Google OAuth / 이메일 / 게스트 모드.
//
//  브랜드 버튼 규정을 지킨다:
//   카카오 = #FEE500 바탕 + 검정 텍스트,  Google = 흰 바탕 + 테두리 + G 마크.

import AuthenticationServices
import SwiftUI

struct AuthScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var showEmailAuth = false
    @StateObject private var googleSignIn = GoogleSignInCoordinator()
    @State private var googleBusy = false
    @State private var googleError: String?
    @State private var googleAttemptID: UUID?

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // 밝은 인증 면은 CI Primary Identity 전체 락업을 원본 그대로 쓴다.
            VStack(spacing: Tokens.Space.s5) {
                PrimaryBrandIdentity()
                    .frame(width: 180, height: 56)
                VStack(spacing: 6) {
                    Text("풀이 과정까지 채점하는 수학").font(.mCallout)
                        .foregroundStyle(Tokens.text3)
                }
            }

            Spacer()

            VStack(spacing: Tokens.Space.s3) {
                Button { startGoogleSignIn() } label: {
                    HStack(spacing: Tokens.Space.s2) {
                        Image("GoogleGMark")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 20, height: 20)
                            .accessibilityHidden(true)
                        Text(googleBusy ? "Google 확인 중…" : "Google로 계속하기")
                            .font(.mBodyB).foregroundStyle(Tokens.text1)
                    }
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                    .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.lineStrong, lineWidth: 1.2))
                }
                .disabled(googleBusy)
                .accessibilityLabel(googleBusy ? "Google 로그인 확인 중" : "Google로 계속하기")

                if let authenticationMessage = googleError ?? store.authenticationNotice {
                    Text(authenticationMessage).font(.mCaption).foregroundStyle(Tokens.dangerInk)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                // 이메일 계정 — 서버(MongoDB) 실가입. 진도가 계정에 동기화된다
                Button {
                    cancelGoogleSignIn()
                    store.clearAuthenticationNotice()
                    showEmailAuth = true
                } label: {
                    HStack(spacing: Tokens.Space.s2) {
                        Image(systemName: "envelope.fill").font(.system(size: 15))
                        Text("이메일로 가입 · 로그인").font(.mBodyB)
                    }
                    .foregroundStyle(Tokens.onBrand)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Tokens.actionPrimary, in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                }

                // 게스트 — 가입 없이 구경. 진도는 기기에만 저장됨을 고지
                Button {
                    cancelGoogleSignIn()
                    store.signIn(provider: "guest")
                } label: {
                    Text("게스트로 둘러보기").font(.mBodyB).foregroundStyle(Tokens.text2)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.lineStrong, lineWidth: 1.2))
                }

                Text("게스트 진도는 이 기기에만 저장됩니다. 로그인하면 서버에 동기화됩니다.")
                    .font(.mMicro).foregroundStyle(Tokens.text4)
                    .padding(.top, 2)

                // ▼▼▼ 디버그 패스 — 이 묶음 하나만 주석 처리하면 사라진다 ▼▼▼
                #if DEBUG
                if !RuntimeMode.isReviewCapture {
                    Button("DEBUG · 로그인 건너뛰기") {
                        cancelGoogleSignIn()
                        store.signIn(provider: "debug")
                    }
                        .font(.mCaption).foregroundStyle(Tokens.text4)
                        .padding(.top, Tokens.Space.s3)
                }
                #endif
                // ▲▲▲ 디버그 패스 끝 ▲▲▲
            }
            .frame(maxWidth: 420)
            .padding(.horizontal, Tokens.Space.s6)
            .padding(.bottom, Tokens.Space.s10)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Tokens.paper)
        .sheet(isPresented: $showEmailAuth) { EmailAuthSheet() }
        .onAppear {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-authSheetCapture") {
                showEmailAuth = true
            }
            #endif
        }
        .onDisappear { cancelGoogleSignIn() }
    }

    private func startGoogleSignIn() {
        cancelGoogleSignIn()
        let attemptID = ServerAPI.beginAuthenticationAttempt()
        googleAttemptID = attemptID
        googleBusy = true
        googleError = nil
        store.clearAuthenticationNotice()
        Task {
            do {
                let auth = try await googleSignIn.signIn()
                guard googleAttemptID == attemptID,
                      try ServerAPI.acceptAuthentication(auth, attemptID: attemptID) else { return }
                googleAttemptID = nil
                store.signInServer(auth.user)
                googleBusy = false
            } catch let error as ASWebAuthenticationSessionError
                where error.code == .canceledLogin {
                ServerAPI.cancelAuthenticationAttempt(attemptID)
                guard googleAttemptID == attemptID else { return }
                googleAttemptID = nil
                googleBusy = false
            } catch {
                ServerAPI.cancelAuthenticationAttempt(attemptID)
                guard googleAttemptID == attemptID else { return }
                googleAttemptID = nil
                googleError = (error as? ServerAPIError)?.errorDescription
                    ?? "Google 로그인을 완료하지 못했습니다."
                googleBusy = false
            }
        }
    }

    private func cancelGoogleSignIn() {
        ServerAPI.cancelAuthenticationAttempt(googleAttemptID)
        googleSignIn.cancel()
        googleAttemptID = nil
        googleBusy = false
    }
}

// MARK: - 이메일 가입/로그인 (서버 /api/v1/auth — Bearer 토큰 트랙)

struct EmailAuthSheet: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    enum Mode: String, CaseIterable { case login = "로그인", register = "회원가입" }
    @State private var mode: Mode = .register

    @State private var realName = ""
    @State private var nickname = ""
    @State private var email = ""
    @State private var password = ""
    @State private var birthDate = Calendar.current.date(
        from: DateComponents(year: 2010, month: 1, day: 1)) ?? Date()
    @State private var grade = 10
    @State private var termsOK = false
    @State private var showSchoolPicker = false
    // 가입 폼의 학교는 **폼 로컬 상태**다. 예전엔 피커가 곧장 store.setSchool 을
    // 불러서 가입을 취소해도 게스트 프로필에 학교가 남았다 — 폼의 다른 필드는
    // 전부 @State 인데 학교만 전역이라 진실원이 갈렸다. store 반영은 가입 성공 후
    // signInServer 가 서버 응답(user.school)으로 수행한다.
    @State private var schoolRegion: String?
    @State private var schoolCode: String?
    @State private var schoolName: String?

    @State private var busy = false
    @State private var errorText: String?
    @State private var showReset = false
    @State private var authAttemptID: UUID?
    private enum FocusedField { case email }
    @FocusState private var focusedField: FocusedField?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                    Picker("", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    .pickerStyle(.segmented)
                    .accessibilityLabel("로그인 또는 회원가입")
                    .disabled(busy)

                    if mode == .register {
                        field("실명", text: $realName, placeholder: "홍길동", contentType: .name)
                        field("닉네임 (GOAT Arena 표시 이름)", text: $nickname,
                              placeholder: "맵쓰수학왕", contentType: .nickname)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("생년월일").font(.mCaption).foregroundStyle(Tokens.text3)
                            DatePicker(
                                "생년월일",
                                selection: $birthDate,
                                in: ...Date(),
                                displayedComponents: .date
                            )
                            .labelsHidden()
                            .datePickerStyle(.compact)
                            .environment(\.locale, Locale(identifier: "ko_KR"))
                        }
                    }
                    field("이메일", text: $email, placeholder: "you@example.com",
                          keyboard: .emailAddress,
                          contentType: mode == .login ? .username : .emailAddress)
                        .focused($focusedField, equals: .email)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("비밀번호").font(.mCaption).foregroundStyle(Tokens.text3)
                        SecureField("8자 이상", text: $password)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(mode == .register ? .newPassword : .password)
                    }

                    if mode == .register {
                        // 320pt Slide Over의 시트 본문은 좌우 패딩을 빼면 272pt다.
                        // 고정 280pt 학년 피커와 학교 버튼을 한 HStack에 두면 둘 다
                        // 오른쪽으로 잘리므로, 가용 폭에 따라 학교 필드를 다음 줄로 보낸다.
                        ViewThatFits(in: .horizontal) {
                            HStack(alignment: .bottom, spacing: Tokens.Space.s4) {
                                gradeField.frame(width: 280)
                                schoolField.fixedSize(horizontal: true, vertical: false)
                            }
                            VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                                gradeField
                                schoolField
                            }
                        }

                        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                            Toggle("필수 약관에 동의합니다", isOn: $termsOK)
                                .font(.mCallout)
                            HStack(spacing: Tokens.Space.s4) {
                                Link("이용약관 보기",
                                     destination: ServerAPI.baseURL.appendingPathComponent("terms"))
                                Link("개인정보처리방침 보기",
                                     destination: ServerAPI.baseURL.appendingPathComponent("privacy"))
                            }
                            .font(.mCaption)
                            .foregroundStyle(Tokens.primary)
                        }
                        .tint(Tokens.primary)
                    }

                    if let e = errorText {
                        Text(e).font(.mCaption).foregroundStyle(Tokens.dangerInk)
                    }

                    if mode == .login {
                        Button("비밀번호를 잊었나요?") { showReset = true }
                            .font(.mCaption).foregroundStyle(Tokens.text3)
                    }

                    Button {
                        submit()
                    } label: {
                        if busy { ProgressView().frame(maxWidth: .infinity, minHeight: 52) }
                        else {
                            Text(mode == .register ? "가입하고 시작하기" : "로그인")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(busy || !formValid)

                    // 잠긴 버튼 아래에서 다음 행동을 말해 준다 (formValid 와 같은 근원)
                    if let hint = firstUnmetHint, !busy {
                        Text(hint).font(.mMicro).foregroundStyle(Tokens.text4)
                    }
                }
                .padding(Tokens.Space.s6)
            }
            .navigationTitle(mode == .register ? "회원가입" : "로그인")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        cancelAuthentication()
                        dismiss()
                    }
                }
            }
            // IPAD_API.md 규약: 가입 폼의 학교 목록은 서버(GET /api/v1/schools)가 우선.
            // 콜백으로 받아 폼 로컬 상태에만 둔다 — 전역 store 를 오염시키지 않고,
            // 서버 목록에만 있는 학교(내장 목록 검증에 걸리던)도 그대로 받는다.
            .sheet(isPresented: $showSchoolPicker) {
                APISchoolPickerSheet { region, code, name in
                    schoolRegion = region
                    schoolCode = code
                    schoolName = name
                }
            }
            .sheet(isPresented: $showReset) { PasswordResetSheet(prefillEmail: email) }
            .onAppear {
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("-authKeyboard") {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                        focusedField = .email
                    }
                }
                #endif
            }
            .onDisappear { cancelAuthentication() }
        }
    }

    private var formValid: Bool { firstUnmetHint == nil }

    /// 버튼이 왜 잠겼는지 — 첫 번째 미충족 조건을 사람 말로. 회색 버튼만 남기면
    /// 사용자는 원인을 추측해야 하고, 오류는 서버 왕복 후에야 나타났다.
    /// 조건과 문구를 한 곳에 모아 formValid 와 안내가 어긋날 수 없게 한다.
    /// (최신 서버 계약: 생년월일은 전 학년 필수, 학교는 N수생을 제외하고 필수.)
    private var firstUnmetHint: String? {
        if !(email.contains("@") && email.contains(".")) { return "이메일 주소를 입력해 주세요" }
        if password.count < 8 { return "비밀번호는 8자 이상이어야 합니다" }
        if mode == .login { return nil }
        if realName.isEmpty { return "실명을 입력해 주세요" }
        if nickname.isEmpty { return "닉네임을 입력해 주세요" }
        if grade != 13, schoolRegion == nil || schoolCode == nil { return "학교를 선택해 주세요" }
        if !termsOK { return "이용약관 동의가 필요합니다" }
        return nil
    }

    private func submit() {
        cancelAuthentication()
        let attemptID = ServerAPI.beginAuthenticationAttempt()
        authAttemptID = attemptID
        busy = true
        errorText = nil
        Task {
            do {
                let auth: AuthResponse
                if mode == .register {
                    auth = try await ServerAPI.register(
                        realName: realName, name: nickname, email: email, password: password,
                        birthDate: birthDateString,
                        schoolGrade: grade,
                        schoolRegion: schoolRegion, schoolCode: schoolCode)
                } else {
                    auth = try await ServerAPI.login(email: email, password: password)
                }
                try await MainActor.run {
                    guard authAttemptID == attemptID,
                          try ServerAPI.acceptAuthentication(auth, attemptID: attemptID) else { return }
                    authAttemptID = nil
                    store.signInServer(auth.user)
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    ServerAPI.cancelAuthenticationAttempt(attemptID)
                    guard authAttemptID == attemptID else { return }
                    authAttemptID = nil
                    errorText = (error as? ServerAPIError)?.errorDescription
                        ?? "서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."
                    busy = false
                }
            }
        }
    }

    private func cancelAuthentication() {
        ServerAPI.cancelAuthenticationAttempt(authAttemptID)
        authAttemptID = nil
        busy = false
    }

    /// 서버 `normalizeBirthDate`가 받는 달력 날짜. ISO8601 시각으로 보내면
    /// 자정의 시간대 변환 때문에 날짜가 하루 밀릴 수 있어 날짜 구성요소만 직렬화한다.
    private var birthDateString: String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: birthDate)
        return String(format: "%04d-%02d-%02d", c.year ?? 2010, c.month ?? 1, c.day ?? 1)
    }

    private var gradeField: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("학년").font(.mCaption).foregroundStyle(Tokens.text3)
            Picker("학년", selection: $grade) {
                Text("고1").tag(10); Text("고2").tag(11); Text("고3").tag(12)
                Text("N수").tag(13)
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 280)
        }
    }

    @ViewBuilder private var schoolField: some View {
        if grade != 13 {
            VStack(alignment: .leading, spacing: 4) {
                Text("학교 (필수)").font(.mCaption).foregroundStyle(Tokens.text3)
                Button {
                    showSchoolPicker = true
                } label: {
                    Text(schoolName ?? "학교 선택")
                        .font(.mCallout)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .foregroundStyle(schoolName == nil ? Tokens.text3 : Tokens.ink)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    @ViewBuilder private func field(_ label: String, text: Binding<String>,
                                    placeholder: String,
                                    keyboard: UIKeyboardType = .default,
                                    contentType: UITextContentType? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.mCaption).foregroundStyle(Tokens.text3)
            TextField(placeholder, text: text)
                .textFieldStyle(.roundedBorder)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .autocapitalization(.none)
                .autocorrectionDisabled()
        }
    }
}

// MARK: - 서버 학교 목록 피커 (IPAD_API.md — GET /api/v1/schools)
//
// 서버 목록이 진실원. 서버에 못 닿으면 기기 내장 목록(schools.json — 같은
// NEIS 데이터라 코드 호환)으로 폴백하고 그 사실을 표시한다.

struct APISchoolPickerSheet: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    /// 선택 결과의 수신처. 가입 폼처럼 전역 store 를 오염시키면 안 되는 호출부는
    /// 콜백으로 받는다. nil 이면 종전대로 store.setSchool — 단, setSchool 은 내장
    /// 목록으로 재검증하므로 서버에만 있는 학교는 조용히 거부된다는 한계가 있다.
    var onPick: ((_ region: String, _ code: String, _ name: String) -> Void)? = nil

    @State private var regions: [String: [ServerAPI.APISchool]] = [:]
    @State private var regionName = ""
    @State private var query = ""
    @State private var loading = true
    @State private var offline = false

    private var regionNames: [String] { regions.keys.sorted() }
    private var schools: [ServerAPI.APISchool] {
        let list = regions[regionName] ?? []
        return query.isEmpty ? list
            : list.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: Tokens.Space.s3) {
                if loading {
                    ProgressView("서버에서 학교 목록을 받는 중…").padding(.top, Tokens.Space.s8)
                    Spacer()
                } else {
                    if offline {
                        Text("서버에 연결하지 못해 기기 내장 목록을 표시합니다.")
                            .font(.mMicro).foregroundStyle(Tokens.warningInk)
                    }
                    Picker("지역", selection: $regionName) {
                        ForEach(regionNames, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)

                    TextField("학교 이름 검색", text: $query)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    List(schools) { school in
                        Button {
                            if let onPick {
                                onPick(regionName, school.code, school.name)
                            } else {
                                store.setSchool(region: regionName, code: school.code)
                            }
                            dismiss()
                        } label: {
                            HStack {
                                Text(school.name).foregroundStyle(Tokens.ink)
                                Spacer()
                                Text(school.highSchoolType ?? "")
                                    .font(.mCaption).foregroundStyle(Tokens.text3)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("학교 선택")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
            .task { await load() }
        }
    }

    private func load() async {
        do {
            let fetched = try await ServerAPI.schools()
            await MainActor.run {
                regions = fetched
                regionName = regionNames.first ?? ""
                loading = false
            }
        } catch {
            // 폴백 — 내장 목록을 같은 모양으로 변환
            let bundled = Dictionary(uniqueKeysWithValues: Schools.regions.map { r in
                (r.name, r.schools.map {
                    ServerAPI.APISchool(code: $0.code, name: $0.name, highSchoolType: $0.type)
                })
            })
            await MainActor.run {
                regions = bundled
                regionName = regionNames.first ?? ""
                offline = true
                loading = false
            }
        }
    }
}

// MARK: - 비밀번호 재설정 3단계 (IPAD_API.md)
//
// request(이메일) → verify(6자리 코드) → complete(새 비밀번호).
// 메일 키 없는 개발 서버는 previewCode 를 응답에 실어준다 — **DEBUG 빌드에서만**
// 보여준다. 출시 바이너리에 이 표시가 남으면, 운영 서버가 메일 키 설정을 잃는
// 순간 아무나 남의 이메일을 넣고 재설정 코드를 화면에서 읽는 계정 탈취 통로가
// 된다. 서버 잘못이 전제라도 클라이언트가 "비밀이 오면 보여준다"는 기본값을
// 갖지 않는 것이 다층 방어다.

struct PasswordResetSheet: View {
    @Environment(\.dismiss) private var dismiss
    let prefillEmail: String

    enum Step { case email, code, newPassword, done }
    @State private var step: Step = .email
    @State private var email = ""
    @State private var code = ""
    @State private var newPassword = ""
    @State private var previewCode: String?
    @State private var authz: ServerAPI.ResetAuthorization?
    @State private var busy = false
    @State private var errorText: String?
    @FocusState private var codeFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                switch step {
                case .email:
                    Text("가입한 이메일로 인증코드를 보냅니다.")
                        .font(.mCallout).foregroundStyle(Tokens.text2)
                    TextField("이메일", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                case .code:
                    Text("이메일로 받은 6자리 코드를 입력하세요.")
                        .font(.mCallout).foregroundStyle(Tokens.text2)
                    // 개발 편의 표시 — Release 에는 컴파일 자체를 남기지 않는다
                    // (파일 머리주석의 계정 탈취 시나리오 참조).
                    #if DEBUG
                    if !RuntimeMode.isReviewCapture, let p = previewCode {
                        Text("개발 서버 미리보기 코드: \(p)")
                            .font(.mCaption).foregroundStyle(Tokens.warningInk)
                    }
                    #endif
                    TextField("123456", text: $code)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .focused($codeFocused)
                case .newPassword:
                    Text("새 비밀번호를 정하세요 (8자 이상).")
                        .font(.mCallout).foregroundStyle(Tokens.text2)
                    SecureField("새 비밀번호", text: $newPassword)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.newPassword)
                case .done:
                    Label("비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.",
                          systemImage: "checkmark.circle.fill")
                        .font(.mBodyB).foregroundStyle(Tokens.successInk)
                }

                if let e = errorText {
                    Text(e).font(.mCaption).foregroundStyle(Tokens.dangerInk)
                }

                Button {
                    advance()
                } label: {
                    if busy { ProgressView().frame(maxWidth: .infinity, minHeight: 48) }
                    else {
                        Text(step == .done ? "로그인하러 가기" : "다음")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(busy || !stepValid)

                Spacer()
            }
            .padding(Tokens.Space.s6)
            .navigationTitle("비밀번호 재설정")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    if codeFocused {
                        Button("완료") { codeFocused = false }
                    }
                }
            }
            .onAppear { if email.isEmpty { email = prefillEmail } }
        }
    }

    private var stepValid: Bool {
        switch step {
        case .email: return email.contains("@")
        case .code: return code.count >= 4
        case .newPassword: return newPassword.count >= 8
        case .done: return true
        }
    }

    private func advance() {
        if step == .done { dismiss(); return }
        busy = true
        errorText = nil
        Task {
            do {
                switch step {
                case .email:
                    let res = try await ServerAPI.passwordResetRequest(email: email)
                    await MainActor.run {
                        #if DEBUG
                        // 서버가 실어 준 미리보기 코드는 DEBUG 에서만 받는다 —
                        // Release 는 값 자체를 버려 표시 경로를 원천 차단한다.
                        previewCode = res.previewCode
                        #else
                        _ = res
                        #endif
                        step = .code
                    }
                case .code:
                    let a = try await ServerAPI.passwordResetVerify(email: email, code: code)
                    await MainActor.run { authz = a; step = .newPassword }
                case .newPassword:
                    guard let a = authz else { throw ServerAPIError(message: "인증 만료 — 처음부터 다시", code: nil) }
                    try await ServerAPI.passwordResetComplete(auth: a, newPassword: newPassword)
                    await MainActor.run { step = .done }
                case .done: break
                }
                await MainActor.run { busy = false }
            } catch {
                await MainActor.run {
                    errorText = (error as? ServerAPIError)?.errorDescription ?? "요청 실패"
                    busy = false
                }
            }
        }
    }
}
