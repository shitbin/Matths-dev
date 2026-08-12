//  MathLabel.swift
//  Matths
//
//  한 줄짜리 수식 라벨 — 채점 리포트처럼 "짧은 문장 + 수식" 이 섞인 자리에 쓴다.
//
//  왜 필요한가: 리포트의 모든 칸이 SwiftUI Text 라 모델이 낸 LaTeX 가 그대로 나왔다.
//  `3^(2/4) x 3^(2/1)`, `a^m × a^n = a^(m+n)`, `√(3^9)` 처럼 ASCII 로 뭉갠 글이
//  화면에 그대로 보였다("코드 수식 또 깨졌어", 2026-07-29 사용자 리포트).
//  강의·해설은 KaTeX 로 조판되는데 정작 채점 결과만 소스가 보이는 상태였다.
//
//  설계 선택: 행마다 WKWebView 를 띄우면 리포트 한 장에 수십 개가 생긴다.
//  그래서 **수식이 든 줄에만** 웹뷰를 붙이고(MathText.containsMath), 나머지는
//  그냥 Text 로 둔다. 판단은 MathInline 이 알아서 한다 — 호출부는 그냥 쓰면 된다.

import SwiftUI
import WebKit

/// 수식이 있으면 KaTeX 로, 없으면 평범한 Text 로 그린다.
struct MathInline: View {
    let text: String
    var font: Font = .mCallout
    var color: Color = Tokens.text1
    /// 조판 크기(pt) — SwiftUI Font 는 크기를 못 읽으므로 호출부가 짝을 맞춰 준다
    var pixelSize: CGFloat = 17

    @State private var height: CGFloat = 20

    var body: some View {
        if MathText.containsMath(text) {
            KaTeXLabel(text: text, pixelSize: pixelSize,
                       hex: color.tokenHexForWeb, height: $height)
                .frame(height: height)
                .id("math-\(text.hashValue)-\(Int(pixelSize))")
        } else {
            Text(text).font(font).foregroundStyle(color)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// `$…$` 가 섞인 한 줄을 KaTeX 로 조판한다. 높이는 스스로 보고한다.
private struct KaTeXLabel: UIViewRepresentable {
    let text: String
    let pixelSize: CGFloat
    let hex: String
    @Binding var height: CGFloat
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage(WebMotion.preferenceKey) private var userMotionEnabled = true

    func makeCoordinator() -> Coordinator { Coordinator(height: $height) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // base64 로 싣는다 — JS 리터럴로 박으면 LaTeX 백슬래시가 한 겹 사라진다
        // (\frac → rac). explain.html 과 같은 이유, 같은 방식이다.
        let payload = [
            "text": text,
            "size": "\(pixelSize)",
            "color": hex,
            "accessibility": "수식 \(MathText.plain(text))"
        ]
        let json = (try? JSONSerialization.data(withJSONObject: payload)) ?? Data("{}".utf8)
        config.userContentController.addUserScript(WKUserScript(
            source: "window.MATTHS_MATH_B64 = \"\(json.base64EncodedString())\";",
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.addUserScript(WKUserScript(
            source: WebContentAccessibility.bootstrapScript(
                size: dynamicTypeSize,
                reduceMotion: reduceMotion,
                userMotionEnabled: userMotionEnabled),
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.add(context.coordinator, name: "mathHeight")

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .clear
        WebContentAccessibility.configure(web)
        if let url = Self.htmlURL {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        WebContentAccessibility.update(
            web,
            size: dynamicTypeSize,
            reduceMotion: reduceMotion,
            userMotionEnabled: userMotionEnabled)
    }

    static let htmlURL: URL? =
        Bundle.main.url(forResource: "mathline", withExtension: "html", subdirectory: "LessonWeb")
        ?? Bundle.main.url(forResource: "mathline", withExtension: "html")

    final class Coordinator: NSObject, WKScriptMessageHandler {
        @Binding var height: CGFloat
        init(height: Binding<CGFloat>) { _height = height }
        func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
            guard let h = m.body as? Double, h > 0 else { return }
            // 미세한 떨림으로 레이아웃이 계속 돌지 않게 1pt 미만 변화는 무시한다
            if abs(height - CGFloat(h)) > 1 { height = CGFloat(h) }
        }
    }
}

private extension Color {
    /// 다크/라이트를 UIKit 으로 해석해 웹에 넘길 hex 를 만든다.
    /// 웹뷰는 SwiftUI 의 색 토큰을 모르므로 여기서 한 번 굽는다.
    var tokenHexForWeb: String {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard ui.getRed(&r, green: &g, blue: &b, alpha: &a) else { return "#17171f" }
        return String(format: "#%02x%02x%02x",
                      Int(r * 255), Int(g * 255), Int(b * 255))
    }
}
