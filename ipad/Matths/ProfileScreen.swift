//  ProfileScreen.swift
//  Matths
//
//  프로필 — 계정 · 학습 통계 · 설정 · 학교(경쟁전 리그).
//  탭이 아니라 상단 바의 아바타 버튼으로 들어온다 (탭 6개가 인지 한계선).
//
//  구성:
//   계정   아바타 · 이름 · 로그인 수단 · 학년 선택
//   통계   완료 개념 / 푼 문항 / 정답률 / 연속 학습일
//   설정   코치 수위 · 테마 · 복습 리마인더 · 화면 모션 · 왼손잡이 · AI 모델 · Pro 구독
//   데이터 동기화 상태 · 진도 초기화(확인 다이얼로그) · 로그아웃 · 회원 탈퇴
//   정보   버전 · 약관·개인정보 링크 · 오픈소스 고지

import AuthenticationServices
import SwiftUI

struct ProfileScreen: View {
    @State private var showWithdraw = false
    @EnvironmentObject private var store: AppStore
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var confirmReset = false
    /// 8GB 기기에서 9B 경량판을 쓰겠다는 선택 (UserDefaults 직결)
    @State private var force9B = ModelDownloader.force9BOnSmallDevice
    #if DEBUG
    @State private var debugTier: String? = ModelDownloader.debugForcedTier
    #endif
    /// 티어 전환 다운로드는 이 화면에서만 시작된다 — 진행률도 여기서 보여야 한다
    @ObservedObject private var downloader = ModelDownloader.shared
    /// 동기화 상태 표면화 — pending·lastSyncedAt·lastError 는 지금까지 아무 화면도
    /// 구독하지 않아, 큐가 쌓이거나 서버가 계속 거부해도 기기에서 파일을 꺼내 봐야만
    /// 알 수 있었다("큐에 넣었으니 됐다" 금지). 프로필 데이터 섹션이 그 창구다.
    @ObservedObject private var sync = SyncEngine.shared

    private let totalConcepts = CurriculumV2.data.courses.reduce(0) { $0 + $1.allConcepts.count }
    private var completedConceptCount: Int {
        CurriculumV2.data.courses
            .flatMap(\.allConcepts)
            .filter { store.progressV2.percent(for: $0) >= 100 }
            .count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s7) {
            // 헤더
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                Button {
                    store.route = .home
                } label: {
                    Label("홈", systemImage: "chevron.left")
                        .font(.mCaption).foregroundStyle(Tokens.text3)
                }
                .buttonStyle(.plain)

                Text("프로필").font(.mTitle).foregroundStyle(Tokens.ink)
                ExamRule()
            }
            .entrance(0)

            // 계정 — 이름은 실데이터(홈 인사와 같은 값)이고 여기서 바로 고친다
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: Tokens.Space.s4) {
                        profileAvatar
                        accountIdentity
                    }
                } else {
                    HStack(spacing: Tokens.Space.s4) {
                        profileAvatar
                        accountIdentity
                        Spacer()
                    }
                }
            }
            .card()
            .entrance(1)

            // 학년 선택 — 3월 1일 학년도 기준 자동 승급 (웹 생애주기 규칙)
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                SectionRule(title: "학년 · GOAT Arena 리그 기준 · 매년 3월 1일 자동 승급")
                // **서버 계정은 학년을 앱에서 바꾸지 않는다.**
                //
                // 여기서 고른 값은 UserDefaults 에만 저장되고 서버로 가지 않았다.
                // 그래서 같은 계정이 앱에서는 "N수생", 웹 랭킹·커리큘럼에서는
                // "고등학교 3학년" 으로 갈렸다. 학년은 가입 때 정하고 그 뒤로는
                // 서버의 자동 진급(매년 3월 1일)이 관리하는 값이다.
                //
                // 13(N수생)은 자동 진급으로만 도달한다 — 선택지에서는 뺀다.
                if store.authProvider == "server" {
                    ViewThatFits(in: .horizontal) {
                        HStack {
                            gradeLabel
                            Spacer(minLength: Tokens.Space.s4)
                            gradeCaption.fixedSize(horizontal: true, vertical: false)
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            gradeLabel
                            gradeCaption
                        }
                    }
                    .padding(.vertical, Tokens.Space.s2)
                } else {
                    Picker("학년", selection: $store.schoolGrade) {
                        Text("고1").tag(10)
                        Text("고2").tag(11)
                        Text("고3").tag(12)
                    }
                    .pickerStyle(.segmented)
                }
            }
            .entrance(2)

            // 학교 — 경쟁전(학교 리그)의 기반. 전국 2,403개교(나이스) 목록에서만 고른다.
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                SectionRule(title: "내 학교 · 학교 리그 기준")
                SchoolPickerRow()
            }
            .entrance(3)

            // 학습 통계
            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                SectionRule(title: "학습 통계")
                // 전부 0인 네 칸은 정보가 아니라 빈자리다 — 0 을 네 번 보여주는 대신
                // 다음에 올 것을 한 줄로 말한다.
                if store.progressV2.byConcept.isEmpty,
                   store.solvedTotal == 0,
                   store.streakDays == 0 {
                    Text("첫 학습 후 통계가 표시됩니다")
                        .font(.mCallout).foregroundStyle(Tokens.text3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .card(padding: Tokens.Space.s4)
                } else {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 0) {
                            stat("완료 개념", "\(completedConceptCount)", "/ \(totalConcepts)")
                            divider
                            stat("푼 문항", "\(store.solvedTotal)", "문항")
                            divider
                            stat("정답률", "\(store.accuracy)", "%")
                            divider
                            stat("연속 학습", "\(store.streakDays)", "일")
                        }
                        .frame(minWidth: 420)

                        LazyVGrid(
                            columns: Array(repeating: GridItem(.flexible(), spacing: Tokens.Space.s3),
                                           count: 2),
                            spacing: Tokens.Space.s4
                        ) {
                            stat("완료 개념", "\(completedConceptCount)", "/ \(totalConcepts)")
                            stat("푼 문항", "\(store.solvedTotal)", "문항")
                            stat("정답률", "\(store.accuracy)", "%")
                            stat("연속 학습", "\(store.streakDays)", "일")
                        }
                    }
                    .card(padding: Tokens.Space.s4)
                }
            }
            .entrance(4)

            // 설정
            VStack(alignment: .leading, spacing: 0) {
                SectionRule(title: "설정").padding(.bottom, Tokens.Space.s2)

                settingRow("코치 수위", caption: "채점 코멘트의 매운 정도") {
                    Picker("", selection: $store.coach.level) {
                        ForEach(SpiceLevel.allCases) { Text($0.name).tag($0) }
                    }
                    .pickerStyle(.segmented).frame(maxWidth: 260)
                    .accessibilityLabel("코치 수위")
                }
                DottedRule()
                // 매일 만지는 설정이 아니다 — segmented 상시 노출 대신 메뉴로 강등.
                // 코치 수위(학습 중 자주 조절)와 노출 무게를 달리한다.
                settingRow("화면 테마", caption: "다크 모드는 로고 원판의 근검정 바탕") {
                    Picker("화면 테마", selection: $store.themePreference) {
                        Text("시스템").tag("system")
                        Text("라이트").tag("light")
                        Text("다크").tag("dark")
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                    .frame(minHeight: 44)   // 메뉴 버튼도 최소 터치 타겟을 지킨다
                }
                DottedRule()
                // 문구는 ReviewReminder(MatthsApp.swift)가 실제로 하는 일과 맞춰 둔다 —
                // 저녁 8시, 그날까지 복습이 걸린 오답이 있는 날에만 기기 로컬 알림.
                // 권한이 거부되면 토글이 스스로 꺼진다(켜진 척하지 않는다).
                settingRow("복습 리마인더", caption: "복습 예정 문항이 있는 날 저녁 8시에 기기 알림") {
                    Toggle("", isOn: $store.reviewReminderOn)
                        .labelsHidden().tint(Tokens.primary)
                        .accessibilityLabel("복습 리마인더")
                }
                DottedRule()
                settingRow("화면 모션", caption: "전환·등장·채점 피드백 애니메이션 (기기의 동작 줄이기가 켜져 있으면 항상 꺼짐)") {
                    Toggle("", isOn: $store.motionOn)
                        .labelsHidden().tint(Tokens.primary)
                        .accessibilityLabel("화면 모션")
                }
                DottedRule()
                settingRow("왼손잡이 모드", caption: "풀이 화면에서 노트를 왼쪽에 둡니다 — 쓰는 손이 문제를 가리지 않게") {
                    Toggle("", isOn: $store.leftHandedOn)
                        .labelsHidden().tint(Tokens.primary)
                        .accessibilityLabel("왼손잡이 모드")
                }
                DottedRule()
                // 메모리 작은 기기(8GB)에서만 노출 — 큰 기기는 이미 9B 를 쓴다
                if !ModelDownloader.hasLargeMemory {
                    #if DEBUG
                    DebugLocalModelSelector(selection: $debugTier, openModelLabel: nil)
                    DottedRule()
                    #else
                    // 용량은 스펙에서 읽는다 — 하드코딩한 숫자는 모델을 낮춰도 그대로 남아
                    // 화면이 실제 선택 모델과 다른 용량을 말하지 않게 스펙에서 읽는다.
                    settingRow("AI 모델 · 9B 실험 모드",
                               caption: "기본은 DeepSeek-R1 7B 추론 모델입니다. 켜면 사진 판독이 끝난 뒤 Qwen3.5 9B 3비트 텍스트판(\(ModelDownloader.spec9BLiteText.sizeLabel))으로 바꿉니다. 실제 8GB 기기에서 약 69초에 동작했지만, 메모리 상황에 따라 앱이 종료될 수 있습니다.") {
                        Toggle("", isOn: $force9B)
                            .labelsHidden().tint(Tokens.primary)
                            .accessibilityLabel("AI 모델 9B 실험 모드")
                            .onChange(of: force9B) {
                                ModelDownloader.force9BOnSmallDevice = force9B
                                // 바뀐 티어의 파일이 아직 없으면 여기서 받기 시작한다.
                                // 이 통로가 없어서, 토글을 켜도 옆에 있던 4B 가 그대로
                                // 다시 열리고(AITutor 대체 후보) 다운로드 카드는
                                // .missing 에서만 뜨니 영영 안 떠 — 토글이 무의미했다.
                                // 파일이 이미 있으면 즉시 교체한다.
                                if !ModelDownloader.shared.startForTierSwitch() {
                                    AITutor.shared.loadRecommended()
                                }
                            }
                    }
                    // 티어 전환 다운로드는 채팅 화면 카드(.missing 전용)에 안 잡힌다 —
                    // 시작한 자리에서 끝까지 보여 준다
                    if case .downloading(let p) = downloader.state {
                        Text("\(ModelDownloader.recommended.shortName) 내려받는 중 · \(Int(p * 100))%")
                            .font(.mCaption).foregroundStyle(Tokens.text3)
                            .padding(.bottom, Tokens.Space.s3)
                    }
                    if case .failed(let why) = downloader.state {
                        Text("내려받기 실패 — \(why)")
                            .font(.mCaption).foregroundStyle(Tokens.dangerInk)
                            .padding(.bottom, Tokens.Space.s3)
                    }
                    DottedRule()
                    #endif
                }
                // 공개 랭킹은 약관·서버 정본과 동일하게 닉네임만 사용한다.
                if store.authProvider == "server" {
                    RankingIdentityRow()
                }

                // 채점 Pro는 기기 내 분석 기능이다. 실제 이용권 상태처럼 보이는
                // 고정 '체험 중' 표시는 제거하고 별도 이용권 허브로 분리한다.
                Button { store.route = .pro } label: {
                    HStack(spacing: Tokens.Space.s3) {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text("Matths Pro").font(.mBodyB).foregroundStyle(Tokens.ink)
                                Text("PRO").font(.mMicro)
                                    .foregroundStyle(Tokens.onBrand)
                                    .padding(.horizontal, 7).padding(.vertical, 2)
                                    .background(Tokens.actionPrimary,
                                                in: RoundedRectangle(cornerRadius: 5))
                            }
                            Text("시험지 사진 채점 · 약한 유형 자동 모의고사")
                                .font(.mCaption).foregroundStyle(Tokens.text3)
                        }
                        Spacer()
                        Text("분석 도구").font(.mCaption).foregroundStyle(Tokens.text3)
                        Image(systemName: "chevron.right").font(.mMicro).foregroundStyle(Tokens.text4)
                    }
                    .padding(.vertical, Tokens.Space.s3)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                DottedRule()

                Button { store.route = .commerce } label: {
                    HStack(spacing: Tokens.Space.s3) {
                        Image(systemName: "bag")
                            .font(.mHeading)
                            .foregroundStyle(Tokens.primary)
                            .frame(width: 30)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("이용권과 상점")
                                .font(.mBodyB)
                                .foregroundStyle(Tokens.ink)
                            Text("구독 상태 · 결제 · Ranked 상점")
                                .font(.mCaption)
                                .foregroundStyle(Tokens.text3)
                        }
                        Spacer(minLength: Tokens.Space.s3)
                        Image(systemName: "chevron.right")
                            .font(.mMicro)
                            .foregroundStyle(Tokens.text4)
                    }
                    .padding(.vertical, Tokens.Space.s3)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHint("이용권 상태와 결제, Ranked 상점을 확인합니다")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
            .entrance(5)

            // 데이터
            VStack(alignment: .leading, spacing: 0) {
                SectionRule(title: "데이터").padding(.bottom, Tokens.Space.s2)

                // 서버 계정만 — 게스트는 큐가 항상 비어 있어 이 줄이 소음이다.
                if store.authProvider == "server" {
                    HStack(alignment: .firstTextBaseline, spacing: Tokens.Space.s4) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("서버 동기화").font(.mBody).foregroundStyle(Tokens.text1)
                            Text(syncStatusLine).font(.mCaption).foregroundStyle(Tokens.text3)
                            if let e = sync.lastError {
                                // 마지막 실패를 삼키지 않고 그대로 보여준다 —
                                // "왜 안 올라가요" 상담의 첫 번째 증거다.
                                Text(e).font(.mMicro).foregroundStyle(Tokens.dangerInk)
                                    .lineLimit(2)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        Spacer()
                        Button("지금 동기화") {
                            Task { await SyncEngine.shared.syncNow() }
                        }
                        .font(.mCaption).foregroundStyle(Tokens.primary)
                        .buttonStyle(.plain)
                    }
                    .padding(.vertical, Tokens.Space.s3)
                    DottedRule()
                }

                Button { confirmReset = true } label: {
                    HStack {
                        Text("진도 초기화").font(.mBody).foregroundStyle(Tokens.dangerInk)
                        Spacer()
                        Text("완료 개념 \(completedConceptCount)개 · 통계 포함")
                            .font(.mCaption).foregroundStyle(Tokens.text4)
                    }
                    .padding(.vertical, Tokens.Space.s3)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .confirmationDialog("진도를 초기화할까요?", isPresented: $confirmReset, titleVisibility: .visible) {
                    Button(store.authProvider == "server"
                           ? "계정과 이 iPad의 진도 지우기"
                           : "완료 기록과 통계를 모두 지우기", role: .destructive) {
                        store.resetProgress()
                        // 화면에 보이는 진도(홈·허브의 퍼센트)는 전부 progressV2 인데
                        // resetProgress() 는 구 진도만 지운다. 여기서 같이 비우지 않으면
                        // 프로필은 "완료 0", 홈·허브는 그대로 100% 라 다이얼로그가
                        // 거짓말이 되고 재실행해도 progress-v2.json 이 살아 돌아온다.
                        store.progressV2 = ProgressV2Store()
                        store.saveProgressV2()
                    }
                    Button("취소", role: .cancel) {}
                } message: {
                    if store.authProvider == "server" {
                        Text("계정과 이 iPad에 저장된 완료 기록 \(completedConceptCount)개와 누적 통계가 지워집니다. 오프라인이면 초기화 요청을 보관했다가 연결되는 즉시 계정 진도에 반영합니다. 되돌릴 수 없습니다.")
                    } else {
                        Text("완료한 개념 \(completedConceptCount)개와 누적 통계가 지워집니다. 되돌릴 수 없습니다.")
                    }
                }

                DottedRule()

                Button { store.signOut() } label: {
                    HStack {
                        Text(store.authProvider == "guest" ? "게스트 나가기 · 로그인하기" : "로그아웃")
                            .font(.mBody).foregroundStyle(Tokens.text1)
                        Spacer()
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.mCaption).foregroundStyle(Tokens.text3)
                    }
                    .padding(.vertical, Tokens.Space.s3)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                // ── 회원 탈퇴 (명세 2.12 · DELETE /api/v1/me) ──────────────
                // 서버 계정에만 보인다. 게스트는 지울 서버 계정이 없다.
                //
                // **익명 보존 탈퇴다.** 계정을 물리적으로 지우는 게 아니라 개인정보를
                // 무효값으로 치환하고 학습 데이터는 익명으로 남긴다. 그 사실을
                // 버튼 옆이 아니라 **확인 화면에서 분명히 적는다** — 되돌릴 수 없는
                // 동작인데 "탈퇴하면 다 지워진다" 고 오해하게 두면 안 된다.
                if store.authProvider == "server" {
                    DottedRule()
                    Button { showWithdraw = true } label: {
                        HStack {
                            Text("회원 탈퇴").font(.mBody).foregroundStyle(Tokens.dangerInk)
                            Spacer()
                            Text("개인정보 삭제 · 학습 데이터는 익명 보존")
                                .font(.mCaption).foregroundStyle(Tokens.text4)
                        }
                        .padding(.vertical, Tokens.Space.s3)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
            .entrance(6)
            .sheet(isPresented: $showWithdraw) { WithdrawSheet() }

            // 정보
            VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                SectionRule(title: "정보")
                HStack {
                    Text("버전 \(appVersion)").font(.mCaption).foregroundStyle(Tokens.text3)
                    Spacer()
                }
                HStack(spacing: Tokens.Space.s4) {
                    Link("이용약관", destination: ServerAPI.baseURL.appendingPathComponent("terms"))
                    Link("개인정보 처리방침", destination: ServerAPI.baseURL.appendingPathComponent("privacy"))
                }
                .font(.mCaption)
                .foregroundStyle(Tokens.actionPrimary)
                .frame(minHeight: 44)
                .accessibilityElement(children: .contain)

                // 오픈소스 고지 — 온디바이스 AI 탑재로 필수가 된 항목 (Apache 2.0 고지 의무)
                DisclosureGroup {
                    VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                        ForEach(Self.licenses, id: \.0) { name, license, url in
                            VStack(alignment: .leading, spacing: 1) {
                                Text("\(name) — \(license)")
                                    .font(.mCaption).foregroundStyle(Tokens.text2)
                                Text(url).font(.mMicro).foregroundStyle(Tokens.text4)
                            }
                        }
                        // KICE 원문은 권리 확인 전에 오픈소스 라이선스로 오인되면 안 된다.
                        // 해당 리소스를 명시적으로 복사하는 내부 Debug 빌드에서만
                        // 소유권과 배포 제한을 표시한다. ‘학습 연구 목적’은 사용 허락이 아니다.
                        if !KiceBank.exams.isEmpty {
                            Text("내부 검증 빌드에 포함된 수능·모의평가 기출 문항의 저작권은 한국교육과정평가원에 있습니다. 사용 허락을 확인하지 않은 기출 원문은 정식 배포 빌드에 포함하지 않습니다.")
                                .font(.mMicro).foregroundStyle(Tokens.text4)
                                .padding(.top, Tokens.Space.s1)
                        }
                    }
                    .padding(.top, Tokens.Space.s2)
                } label: {
                    Text(KiceBank.exams.isEmpty ? "오픈소스 라이선스" : "오픈소스 및 저작권 고지")
                        .font(.mCaption).foregroundStyle(Tokens.text3)
                }
                .tint(Tokens.text3)
            }
            .entrance(7)
        }
    }

    /// 고지 대상 — 번들·다운로드로 탑재되는 서드파티 전부
    private static let licenses: [(String, String, String)] = [
        ("Qwen3.5 (Alibaba Cloud)", "Apache License 2.0", "huggingface.co/Qwen"),
        ("Qwen2.5-VL 3B (Alibaba Cloud)", "Apache License 2.0", "huggingface.co/Qwen"),
        ("DeepSeek-R1-Distill-Qwen-7B", "MIT License", "huggingface.co/deepseek-ai"),
        ("llama.cpp (ggml-org)", "MIT License", "github.com/ggml-org/llama.cpp"),
        ("KaTeX", "MIT License", "katex.org"),
        ("Pretendard", "SIL Open Font License 1.1", "github.com/orioncactus/pretendard"),
        ("lottie-web (Airbnb)", "MIT License", "github.com/airbnb/lottie-web"),
    ]

    // MARK: 조각들

    private var profileAvatar: some View {
        ZStack {
            Circle().fill(Tokens.actionPrimary)
            Text(String(store.userName.prefix(1)))
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(Tokens.onBrand)
        }
        .frame(width: 62, height: 62)
        .accessibilityHidden(true)
    }

    private var accountIdentity: some View {
        VStack(alignment: .leading, spacing: 5) {
            // 서버 정본 이름은 읽기 전용이다. 접근성 글자 크기에서는 아바타 아래
            // 전폭을 쓰므로 긴 닉네임도 한 글자 열로 찌그러지지 않는다.
            if store.authProvider == "server" {
                ViewThatFits(in: .horizontal) {
                    Text("\(store.userName)님")
                        .font(.mHeading)
                        .foregroundStyle(Tokens.ink)
                        .fixedSize(horizontal: true, vertical: false)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(store.userName)
                            .font(.mBodyB)
                            .foregroundStyle(Tokens.ink)
                            .lineLimit(1)
                            .truncationMode(.tail)
                        Text("님")
                            .font(.mBodyB)
                            .foregroundStyle(Tokens.ink)
                    }
                }
            } else {
                HStack(spacing: 2) {
                    TextField("이름", text: $store.userName)
                        .font(.mHeading).foregroundStyle(Tokens.ink)
                        .textFieldStyle(.plain)
                        .frame(minWidth: 0)
                        .layoutPriority(1)
                        .submitLabel(.done)
                    Text("님").font(.mHeading).foregroundStyle(Tokens.ink)
                    Image(systemName: "pencil").font(.mMicro).foregroundStyle(Tokens.text4)
                }
            }
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 6) {
                    providerBadge
                    Text(store.gradeLabel).font(.mCaption).foregroundStyle(Tokens.text3)
                }
                VStack(alignment: .leading, spacing: 4) {
                    providerBadge
                    Text(store.gradeLabel).font(.mCaption).foregroundStyle(Tokens.text3)
                }
            }
            if store.authProvider == "server" {
                Text("이름은 웹 프로필에서 변경할 수 있습니다")
                    .font(.mMicro).foregroundStyle(Tokens.text4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !store.userEmail.isEmpty {
                Text(store.userEmail)
                    .font(.mMicro).foregroundStyle(Tokens.text4)
                    .lineLimit(1).truncationMode(.middle)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var providerBadge: some View {
        let (label, fg, bg): (String, Color, Color) = switch store.authProvider {
        case "kakao":  ("카카오 로그인", Color(hex: 0x191600), Color(hex: 0xFEE500))
        case "google": ("Google 로그인", Color(hex: 0x1F1F1F), Color(hex: 0xF1F3F4))
        case "server": ("Matths 계정", Tokens.onPrimary, Tokens.primary)
        case "debug":  ("DEBUG", Tokens.text2, Tokens.paper2)
        default:       ("게스트", Tokens.text2, Tokens.paper2)
        }
        return Text(label).font(.mMicro).foregroundStyle(fg)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(bg, in: Capsule())
            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    }

    private var gradeLabel: some View {
        Text(store.gradeLabel).font(.mBody).foregroundStyle(Tokens.ink)
    }

    private var gradeCaption: some View {
        Text("서버 기준 · 매년 3월 1일 자동 승급")
            .font(.mCaption).foregroundStyle(Tokens.text4)
    }

    private func stat(_ label: String, _ value: String, _ unit: String) -> some View {
        VStack(spacing: 4) {
            Text(label).font(.mMicro).foregroundStyle(Tokens.text3)
            (Text(value).font(.mStat).foregroundStyle(Tokens.ink)
             + Text(" \(unit)").font(Font.stat(12)).foregroundStyle(Tokens.text3))
        }
        .frame(maxWidth: .infinity)
    }

    private var divider: some View {
        Rectangle().fill(Tokens.line).frame(width: 1, height: 40)
    }

    private func settingRow(_ title: String, caption: String,
                            @ViewBuilder control: () -> some View) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Tokens.Space.s4) {
                settingCopy(title, caption: caption)
                    .fixedSize(horizontal: true, vertical: true)
                Spacer(minLength: Tokens.Space.s4)
                control()
            }

            VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                settingCopy(title, caption: caption)
                control()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.vertical, Tokens.Space.s3)
    }

    private func settingCopy(_ title: String, caption: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.mBodyB).foregroundStyle(Tokens.ink)
            Text(caption).font(.mCaption).foregroundStyle(Tokens.text3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    /// "보낼 기록 N건 · 마지막 성공 3분 전" — 대기 큐와 마지막 성공 시각을 한 줄로.
    /// 성공 기록이 아직 없으면 없다고 말한다(있는 척하지 않는다).
    private var syncStatusLine: String {
        let queuePart = sync.pending == 0 ? "보낼 기록 없음" : "보낼 기록 \(sync.pending)건"
        guard let at = sync.lastSyncedAt else {
            return "\(queuePart) · 이번 실행에서 아직 동기화 성공 없음"
        }
        let f = RelativeDateTimeFormatter()
        f.locale = Locale(identifier: "ko_KR")
        f.unitsStyle = .short
        return "\(queuePart) · 마지막 성공 \(f.localizedString(for: at, relativeTo: Date()))"
    }
}

// MARK: - 학교 선택 (경쟁전 리그)

/// 서버 학교 목록은 앱 번들보다 먼저 갱신될 수 있다. 서버가 검증해 돌려준
/// 학교명까지 계정 슬롯에 보관해야 `Schools.find`에 아직 없는 학교도 재실행 후
/// "학교 미설정"으로 되돌아가지 않는다.
private struct ServerVerifiedSchoolRecord: Codable {
    let region: String
    let code: String
    let name: String
}

private extension AppStore {
    static var serverVerifiedSchoolKey: String {
        AppStore.slotKey("matths.serverVerifiedSchool")
    }

    var profileSchoolName: String? {
        guard let region = schoolRegion, let code = schoolCode else { return nil }
        if let data = UserDefaults.standard.data(forKey: Self.serverVerifiedSchoolKey),
           let record = try? JSONDecoder().decode(ServerVerifiedSchoolRecord.self, from: data),
           record.region == region,
           record.code == code,
           !record.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return record.name
        }
        return schoolName
    }

    func setServerVerifiedSchool(region: String, code: String, name: String) {
        schoolRegion = region
        schoolCode = code
        let record = ServerVerifiedSchoolRecord(region: region, code: code, name: name)
        if let data = try? JSONEncoder().encode(record) {
            UserDefaults.standard.set(data, forKey: Self.serverVerifiedSchoolKey)
        }
    }

    func clearServerVerifiedSchool() {
        schoolRegion = nil
        schoolCode = nil
        UserDefaults.standard.removeObject(forKey: Self.serverVerifiedSchoolKey)
    }
}

struct SchoolPickerRow: View {
    @EnvironmentObject private var store: AppStore
    @State private var showPicker = false
    @State private var saving = false
    @State private var errorText: String?

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Tokens.Space.s4) {
                schoolCopy
                Spacer(minLength: Tokens.Space.s4)
                schoolButton
            }
            .frame(minWidth: 360)

            VStack(alignment: .leading, spacing: 3) {
                schoolCopy
                schoolButton
            }
        }
        .padding(.vertical, Tokens.Space.s2)
        .sheet(isPresented: $showPicker) {
            APISchoolPickerSheet { region, code, _ in
                chooseSchool(region: region, code: code)
            }
        }
        .onChange(of: DataScope.slot) { _, _ in
            // 계정을 바꾼 뒤 앞 계정 요청의 실패 문구가 새 프로필에 남지 않는다.
            saving = false
            errorText = nil
        }
        .task(id: "\(store.authProvider ?? "guest")|\(DataScope.slot)") {
            await refreshServerSchool()
        }
    }

    private var schoolCopy: some View {
        let displayedSchoolName = store.profileSchoolName
        return VStack(alignment: .leading, spacing: 3) {
            Text(displayedSchoolName ?? "학교 미설정")
                .font(.mBodyB)
                .foregroundStyle(displayedSchoolName == nil ? Tokens.text3 : Tokens.ink)
            Text(store.schoolRegion.map { "\($0) · 학교 리그 집계 기준" }
                 ?? "학교를 고르면 학교 리그에 참가합니다")
                .font(.mCaption).foregroundStyle(Tokens.text3)
                .fixedSize(horizontal: false, vertical: true)
            if saving {
                Label("학교 리그 기준을 서버에 반영하는 중", systemImage: "arrow.triangle.2.circlepath")
                    .font(.mMicro)
                    .foregroundStyle(Tokens.text3)
            } else if let errorText {
                Text(errorText)
                    .font(.mMicro)
                    .foregroundStyle(Tokens.dangerInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var schoolButton: some View {
        Button(saving ? "반영 중…" : (store.profileSchoolName == nil ? "학교 선택" : "변경")) {
            errorText = nil
            showPicker = true
        }
            .font(.mCaption).foregroundStyle(Tokens.primary)
            .padding(.horizontal, Tokens.Space.s4)
            .frame(minHeight: 36)
            .overlay(Capsule().strokeBorder(Tokens.primary, lineWidth: 1.1))
            .buttonStyle(.plain)
            .disabled(saving)
    }

    private func chooseSchool(region: String, code: String) {
        errorText = nil

        // 게스트는 서버 정본이 없으므로 기존 로컬 저장이 맞다.
        guard store.authProvider == "server" else {
            store.setSchool(region: region, code: code)
            return
        }

        let accountSlot = DataScope.slot
        saving = true
        Task {
            do {
                let user = try await ServerAPI.updateSchool(region: region, code: code)
                await MainActor.run {
                    // 요청 중 로그아웃·계정 전환이 일어났다면 앞 계정 응답을 새 계정에
                    // 붙이지 않는다. 서버에는 올바른 앞 계정으로 이미 반영되어 있다.
                    guard store.authProvider == "server", DataScope.slot == accountSlot else {
                        return
                    }
                    guard let school = user.school,
                          let confirmedRegion = school.region,
                          let confirmedCode = school.code,
                          let confirmedName = school.name?.trimmingCharacters(in: .whitespacesAndNewlines),
                          !confirmedName.isEmpty else {
                        errorText = "서버가 변경된 학교를 확인하지 못했습니다. 다시 시도해 주세요."
                        return
                    }
                    store.setServerVerifiedSchool(
                        region: confirmedRegion,
                        code: confirmedCode,
                        name: confirmedName)
                }
            } catch {
                await MainActor.run {
                    guard store.authProvider == "server", DataScope.slot == accountSlot else {
                        return
                    }
                    errorText = (error as? ServerAPIError)?.errorDescription
                        ?? "학교를 변경하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요."
                }
            }
            await MainActor.run {
                if DataScope.slot == accountSlot { saving = false }
            }
        }
    }

    /// 프로필을 열 때 서버 DTO를 다시 받아 다른 기기·웹에서 바꾼 학교도 맞춘다.
    /// 네트워크 실패 때는 마지막 확인값을 유지하고, 서버가 명시적으로 학교 없음으로
    /// 응답했을 때만 로컬 값을 비운다.
    private func refreshServerSchool() async {
        guard store.authProvider == "server" else { return }
        let accountSlot = DataScope.slot
        do {
            let user = try await ServerAPI.me()
            await MainActor.run {
                guard store.authProvider == "server", DataScope.slot == accountSlot else { return }
                guard let school = user.school else {
                    store.clearServerVerifiedSchool()
                    return
                }
                guard let region = school.region,
                      let code = school.code,
                      let name = school.name?.trimmingCharacters(in: .whitespacesAndNewlines),
                      !name.isEmpty else { return }
                store.setServerVerifiedSchool(region: region, code: code, name: name)
            }
        } catch {
            // 이 동기화는 마지막 확인값을 보강하는 작업이다. 일시적인 오프라인에서
            // 이미 보이는 학교를 지우거나 프로필 진입을 막지 않는다.
        }
    }
}

/// 공개 랭킹은 닉네임 전용이다. 실명은 계정 확인에만 사용하고 노출하지 않는다.
struct RankingIdentityRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Space.s2) {
            ViewThatFits(in: .horizontal) {
                HStack {
                    rankingIdentityCopy
                    Spacer(minLength: Tokens.Space.s4)
                    identityBadge
                }

                VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                    rankingIdentityCopy
                    identityBadge
                }
            }
            Text("가입 시 등록한 실명은 계정 확인에만 사용하며 다른 학생에게 공개하지 않습니다.")
                .font(.mMicro).foregroundStyle(Tokens.text4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, Tokens.Space.s2)
    }

    private var rankingIdentityCopy: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("랭킹 공개 이름").font(.mBodyB).foregroundStyle(Tokens.ink)
            Text("GOAT Arena와 랭킹에서 다른 학생에게 보이는 이름")
                .font(.mCaption).foregroundStyle(Tokens.text3)
        }
    }

    private var identityBadge: some View {
        Text("닉네임")
            .font(.mCaption).foregroundStyle(Tokens.primary)
            .padding(.horizontal, Tokens.Space.s3).padding(.vertical, 7)
            .background(Tokens.paper2, in: Capsule())
            .accessibilityLabel("공개 이름: 닉네임")
    }
}

// MARK: - 회원 탈퇴 시트 (명세 2.12)
//
// 서버가 요구하는 세 가지를 **화면에서 그대로 받는다** — 비밀번호, 확인 문구 "탈퇴",
// 익명 보존 동의. 하나라도 빠지면 서버가 400 을 준다. 앱이 미리 막아 주는 편이
// 낫지만, 문구 검사를 앱이 임의로 완화하지는 않는다(서버가 진실원이다).
//
// 이 화면이 하지 않는 것: "정말요?" 를 두 번 묻지 않는다. 확인 문구를 직접 치는 것이
// 이미 그 역할이다. 대신 **무엇이 남고 무엇이 지워지는지**를 숨기지 않고 적는다.
private struct WithdrawSheet: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    @State private var password = ""
    @State private var phrase = ""
    @State private var agreed = false
    @State private var busy = false
    @State private var errorText: String?
    @State private var options: ServerAPI.WithdrawalOptions?
    @State private var googleReauthentication:
        ServerAPI.GoogleWithdrawalReauthentication?
    @State private var googleBusy = false
    @StateObject private var google = GoogleSignInCoordinator()

    private var canSubmit: Bool {
        (googleReauthentication != nil || !password.isEmpty)
            && phrase.trimmingCharacters(in: .whitespaces) == ServerAPI.withdrawConfirmationPhrase
            && agreed && !busy && !googleBusy
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Tokens.Space.s5) {
                    VStack(alignment: .leading, spacing: Tokens.Space.s2) {
                        Text("탈퇴하면 이렇게 됩니다")
                            .font(.mBodyB).foregroundStyle(Tokens.ink)
                        // 명세 2.12 를 사용자 말로 옮긴 것. 지어내지 않는다.
                        bullet("이름·이메일 같은 개인정보는 무효값으로 바뀝니다")
                        bullet("학습 기록은 이름을 지운 채 통계로만 남습니다")
                        bullet("랭킹에서 빠집니다 — 순위표에 더 이상 보이지 않습니다")
                        bullet("쓴 글과 댓글은 익명 처리됩니다")
                        bullet("학교는 광역 지역 수준만 남습니다")
                        bullet("지금 로그인된 모든 기기에서 즉시 로그아웃됩니다")
                    }
                    .padding(Tokens.Space.s4)
                    .background(Tokens.dangerSoft,
                                in: RoundedRectangle(cornerRadius: Tokens.Radius.md))

                    VStack(alignment: .leading, spacing: Tokens.Space.s3) {
                        if googleReauthentication != nil {
                            Label("Google 본인 확인 완료 · 5분 동안 한 번만 사용 가능",
                                  systemImage: "checkmark.shield.fill")
                                .font(.mCallout)
                                .foregroundStyle(Tokens.successInk)
                                .fixedSize(horizontal: false, vertical: true)
                        } else {
                            Text("현재 비밀번호").font(.mCaption).foregroundStyle(Tokens.text3)
                            SecureField("비밀번호", text: $password)
                                .textContentType(.password)
                                .textFieldStyle(.roundedBorder)

                            if options?.googleReauthentication.linked == true {
                                Button {
                                    Task { await verifyWithGoogle() }
                                } label: {
                                    HStack(spacing: Tokens.Space.s2) {
                                        Image("GoogleGMark")
                                            .resizable().scaledToFit()
                                            .frame(width: 18, height: 18)
                                            .accessibilityHidden(true)
                                        if googleBusy { ProgressView().controlSize(.small) }
                                        Text(googleBusy
                                             ? "Google 확인 중…"
                                             : "Google로 본인 확인")
                                            .font(.mBodyB)
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 48)
                                    .background(Tokens.surface,
                                                in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                                    .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                        .strokeBorder(Tokens.lineStrong, lineWidth: 1.1))
                                }
                                .buttonStyle(.plain)
                                .disabled(
                                    googleBusy ||
                                    options?.googleReauthentication.available != true)

                                if options?.googleReauthentication.available == false {
                                    Text("Google 본인 확인이 아직 서버에 설정되지 않았습니다.")
                                        .font(.mCaption).foregroundStyle(Tokens.dangerInk)
                                } else {
                                    Text("Google로 가입해 비밀번호가 없다면 이 방법을 사용해주세요.")
                                        .font(.mCaption).foregroundStyle(Tokens.text3)
                                }
                            }
                        }

                        Text("확인 문구 — \(ServerAPI.withdrawConfirmationPhrase) 라고 입력")
                            .font(.mCaption).foregroundStyle(Tokens.text3)
                        TextField(ServerAPI.withdrawConfirmationPhrase, text: $phrase)
                            .textFieldStyle(.roundedBorder)
                            .autocorrectionDisabled()

                        Toggle(isOn: $agreed) {
                            Text("학습 데이터가 익명으로 보존되는 것에 동의합니다")
                                .font(.mCallout).foregroundStyle(Tokens.text2)
                        }
                        .tint(Tokens.primary)
                    }

                    if let e = errorText {
                        Text(e).font(.mCaption).foregroundStyle(Tokens.dangerInk)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if busy { ProgressView().controlSize(.small) }
                            Text(busy ? "처리 중…" : "탈퇴하기")
                                .font(.mBodyB)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Tokens.Space.s3)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Tokens.onPrimary)
                    .background(canSubmit ? Tokens.danger : Tokens.text4,
                                in: RoundedRectangle(cornerRadius: Tokens.Radius.md))
                    .disabled(!canSubmit)
                }
                .padding(Tokens.Space.s5)
            }
            .background(Tokens.paper)
            .navigationTitle("회원 탈퇴")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") { dismiss() }
                }
            }
        }
        .task { await loadWithdrawalOptions() }
        .onDisappear { google.cancel() }
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: Tokens.Space.s2) {
            Text("·").font(.mBody).foregroundStyle(Tokens.dangerInk)
            Text(text).font(.mCallout).foregroundStyle(Tokens.text2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func submit() async {
        busy = true
        errorText = nil
        defer { busy = false }
        do {
            if let googleReauthentication {
                _ = try await ServerAPI.withdrawMe(
                    reauthentication: googleReauthentication,
                    acknowledgeAnonymousRetention: agreed)
            } else {
                _ = try await ServerAPI.withdrawMe(
                    password: password,
                    acknowledgeAnonymousRetention: agreed)
            }
            // 서버가 토큰 버전을 올렸으므로 이 기기의 토큰도 이미 무효다.
            // 로컬 세션을 정리하고 로그인 화면으로 돌려보낸다.
            await MainActor.run {
                // 시트가 약속한 개인정보 삭제는 서버 얘기만이면 안 된다 — 이 기기의
                // 계정 슬롯(필기 PNG 가 든 오답노트·이벤트 로그·풀이 사진)과 슬롯
                // 스코프 UserDefaults(이메일·이름·통계)도 함께 지운다. 계정이
                // 서버에서 사라져 이 슬롯으로 다시 로그인할 길이 없으므로
                // 남겨 두면 접근 불능 고아 데이터가 된다.
                // 순서가 중요하다: 슬롯 이름·경로를 **먼저** 붙잡는다 — signOut 이
                // 게스트 슬롯으로 전환하면 DataScope.directory 가 게스트를 가리킨다.
                let withdrawnSlot = DataScope.slot
                let withdrawnDir = DataScope.directory
                store.signOut()
                Self.purgeWithdrawnSlot(named: withdrawnSlot, directory: withdrawnDir)
                dismiss()
            }
        } catch {
            errorText = "탈퇴하지 못했습니다 — \(error.localizedDescription)"
        }
    }

    private func loadWithdrawalOptions() async {
        do {
            options = try await ServerAPI.withdrawalOptions()
        } catch {
            // 기존 이메일/비밀번호 탈퇴는 options 조회와 독립적으로 유지한다.
            // 구버전 서버나 일시적인 네트워크 오류가 비밀번호 탈퇴까지 막으면 안 된다.
        }
    }

    private func verifyWithGoogle() async {
        google.cancel()
        googleBusy = true
        errorText = nil
        defer { googleBusy = false }
        do {
            googleReauthentication = try await google
                .reauthenticateForAccountDeletion()
            password = ""
        } catch let error as ASWebAuthenticationSessionError
            where error.code == .canceledLogin {
            return
        } catch {
            errorText = (error as? ServerAPIError)?.errorDescription
                ?? "Google 본인 확인을 완료하지 못했습니다."
        }
    }

    /// 탈퇴 **확정** 계정의 로컬 잔재 삭제. 서버 2xx 를 받은 뒤에만 부른다 —
    /// 실패한 탈퇴에서 지우면 살아 있는 계정의 데이터를 파괴하는 사고다.
    /// 게스트 슬롯은 계정과 무관한 이 기기 사용자의 기록이므로 절대 지우지 않는다.
    private static func purgeWithdrawnSlot(named slot: String, directory: URL) {
        guard slot != "guest" else { return }
        do {
            try FileManager.default.removeItem(at: directory)
        } catch {
            // 이미 없으면 정상. 그 외 실패는 잔재가 남았다는 뜻이라 흔적을 남긴다
            // (콘솔 로그가 이 앱의 최소 증거 채널이다).
            print("Matths 탈퇴 정리: 슬롯 파일 삭제 실패 — \(error.localizedDescription)")
        }
        // 슬롯 스코프 UserDefaults — AppStore.slotKey 규약("<키>.<슬롯>")과
        // SyncEngine pull 커서("matths.sync.lastPull.<슬롯>") 모두 같은 접미사라
        // 접미사 하나로 걸러 지운다. 전역 키(테마·모션 등)는 접미사가 없어 남는다.
        let defaults = UserDefaults.standard
        let suffix = "." + slot
        for key in defaults.dictionaryRepresentation().keys where key.hasSuffix(suffix) {
            defaults.removeObject(forKey: key)
        }
        print("Matths 탈퇴 정리: 슬롯 \(slot) 로컬 데이터 삭제 완료")
    }
}
