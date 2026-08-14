//  SolutionCanvas.swift
//  Matths
//
//  PencilKit 필기 캔버스. 학생의 풀이 과정을 그대로 받아 AI 채점에 넘긴다.
//  웹(PWA)의 canvas 구현과 같은 역할이지만, 네이티브는 Apple Pencil 의
//  필압·기울기·팜리젝션을 시스템이 처리해 준다.

import SwiftUI
import PencilKit

enum SolutionCanvasTool: String, CaseIterable, Identifiable {
    case pen
    case eraser
    case select

    var id: String { rawValue }
    var label: String {
        switch self {
        case .pen: return "펜"
        case .eraser: return "지우개"
        case .select: return "선택·이동"
        }
    }
    var icon: String {
        switch self {
        case .pen: return "pencil.tip"
        case .eraser: return "eraser"
        case .select: return "lasso"
        }
    }
}

struct SolutionCanvas: UIViewRepresentable {
    @Binding var drawing: PKDrawing
    /// 손가락으로도 쓸 수 있게 할지. 기본은 펜슬 전용(팜 리젝션).
    var allowsFingerDrawing: Bool = false
    var selectedTool: SolutionCanvasTool = .pen
    var inkWidth: CGFloat = 3
    var onStrokeCommitted: ((PKDrawing, PKDrawing) -> Void)?

    func makeUIView(context: Context) -> PKCanvasView {
        let canvas = PKCanvasView()
        canvas.drawing = drawing
        canvas.delegate = context.coordinator
        canvas.drawingPolicy = allowsFingerDrawing ? .anyInput : .pencilOnly
        canvas.tool = configuredTool
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        // 격자 배경은 SwiftUI 쪽에서 깔고, 캔버스는 투명하게 얹는다
        canvas.alwaysBounceVertical = false
        canvas.isAccessibilityElement = true
        canvas.accessibilityLabel = "풀이 필기 캔버스"
        canvas.accessibilityHint = inputAccessibilityHint
        canvas.accessibilityIdentifier = "solutionCanvas"
        canvas.accessibilityTraits.insert(.allowsDirectInteraction)
        return canvas
    }

    func updateUIView(_ canvas: PKCanvasView, context: Context) {
        context.coordinator.parent = self
        if canvas.drawing != drawing { canvas.drawing = drawing }
        canvas.drawingPolicy = allowsFingerDrawing ? .anyInput : .pencilOnly
        canvas.tool = configuredTool
        canvas.accessibilityHint = inputAccessibilityHint
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    private var configuredTool: PKTool {
        switch selectedTool {
        case .pen:
            return PKInkingTool(.pen, color: .label, width: inkWidth)
        case .eraser:
            return PKEraserTool(.vector)
        case .select:
            return PKLassoTool()
        }
    }

    private var inputAccessibilityHint: String {
        allowsFingerDrawing
            ? "손가락 또는 호환되는 펜으로 풀이를 씁니다"
            : "Apple Pencil로 풀이를 씁니다"
    }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        var parent: SolutionCanvas
        private var drawingAtToolStart: PKDrawing?
        init(_ parent: SolutionCanvas) { self.parent = parent }

        func canvasViewDidBeginUsingTool(_ canvasView: PKCanvasView) {
            drawingAtToolStart = canvasView.drawing
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            parent.drawing = canvasView.drawing
        }

        func canvasViewDidEndUsingTool(_ canvasView: PKCanvasView) {
            guard let before = drawingAtToolStart else { return }
            drawingAtToolStart = nil
            let after = canvasView.drawing
            guard before.dataRepresentation() != after.dataRepresentation() else { return }
            parent.onStrokeCommitted?(before, after)
        }
    }
}

/// 격자 배경 — 그래프·표를 그리기 쉽게. 웹 데모의 24px 격자와 같은 간격.
struct GraphPaper: View {
    var spacing: CGFloat = 24

    var body: some View {
        Canvas { context, size in
            let line = Color(.separator).opacity(0.6)
            var path = Path()
            var x: CGFloat = 0
            while x <= size.width { path.move(to: .init(x: x, y: 0)); path.addLine(to: .init(x: x, y: size.height)); x += spacing }
            var y: CGFloat = 0
            while y <= size.height { path.move(to: .init(x: 0, y: y)); path.addLine(to: .init(x: size.width, y: y)); y += spacing }
            context.stroke(path, with: .color(line), lineWidth: 0.5)
        }
        .allowsHitTesting(false)
    }
}

/// 풀이 노트 전체 (격자 + 캔버스 + 도구 + 확대·축소)
struct SolutionNote: View {
    @Binding var drawing: PKDrawing
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @State private var allowsFinger = UniversalLayoutPolicy.defaultsToFingerDrawing(
        on: UIDevice.current.userInterfaceIdiom == .phone ? .phone : .pad)
    @State private var zoom: CGFloat = 1
    @State private var selectedTool: SolutionCanvasTool = .pen
    @State private var inkWidth: CGFloat = 3
    @State private var undoStack: [PKDrawing] = []
    @State private var redoStack: [PKDrawing] = []

    private let zoomRange: ClosedRange<CGFloat> = 1.0...3.0

    private var deviceClass: MatthsDeviceClass {
        UIDevice.current.userInterfaceIdiom == .phone ? .phone : .pad
    }

    private var horizontalLayoutClass: MatthsLayoutClass {
        switch horizontalSizeClass {
        case .compact: .compact
        case .regular: .regular
        default: .unspecified
        }
    }

    private var verticalLayoutClass: MatthsLayoutClass {
        switch verticalSizeClass {
        case .compact: .compact
        case .regular: .regular
        default: .unspecified
        }
    }

    private var usesFingerDrawing: Bool {
        deviceClass == .phone || allowsFinger
    }

    private var canvasMinimumHeight: CGFloat {
        UniversalLayoutPolicy.solutionCanvasMinimumHeight(
            on: deviceClass,
            horizontal: horizontalLayoutClass,
            vertical: verticalLayoutClass)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: Tokens.Space.s3) {
                Text("풀이 노트").font(.caption.weight(.heavy)).foregroundStyle(.secondary)
                Spacer()

                if deviceClass == .phone {
                    Label("손가락 필기", systemImage: "hand.draw")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Tokens.text3)
                        .accessibilityLabel("손가락 필기 사용 중")
                        .accessibilityHint("iPhone에서는 손가락으로 바로 풀이를 쓸 수 있습니다")
                } else {
                    Toggle("손가락 필기", isOn: $allowsFinger)
                        .font(.caption)
                        .toggleStyle(.switch)
                        .fixedSize()
                        .accessibilityHint("끄면 Apple Pencil로만 필기합니다")
                }
            }

            pencilToolbar

            // 격자와 필기가 함께 확대·축소된다 (내용 좌표는 불변 — 채점 PNG 무영향)
            ZoomableNote(zoom: $zoom, zoomRange: zoomRange) {
                ZStack {
                    Rectangle().fill(Color(.systemBackground))
                    GraphPaper()
                    SolutionCanvas(
                        drawing: $drawing,
                        allowsFingerDrawing: usesFingerDrawing,
                        selectedTool: selectedTool,
                        inkWidth: inkWidth,
                        onStrokeCommitted: recordChange)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color(.separator), lineWidth: 1.5))
            // 필기 공간은 화면의 주인공이다 — 320pt 는 두 줄 쓰면 끝났다.
            // (ScrollView 안이라 maxHeight: .infinity 는 금지 — 무한 제안을 받는다)
            .frame(minHeight: canvasMinimumHeight)

            Text(deviceClass == .phone
                 ? "손가락으로 바로 쓸 수 있습니다. 두 손가락 핀치로 확대할 수 있고, 필기는 채점에 함께 제출됩니다."
                 : "Apple Pencil로 바로 쓸 수 있습니다. 두 손가락 핀치로 확대해 좁은 구석에도 쓸 수 있고, 필기는 채점에 함께 제출됩니다.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func setZoom(_ v: CGFloat) {
        zoom = min(max(v, zoomRange.lowerBound), zoomRange.upperBound)
    }

    /// 320pt에서는 가로 스크롤 안쪽에 실행 취소·전체 지우기가 숨어 도구가 없는 것처럼
    /// 보였다. 좁은 폭은 기능군별 세 줄, 넓은 폭은 한 줄로 두되 같은 동작을 공유한다.
    @ViewBuilder private var pencilToolbar: some View {
        if horizontalSizeClass == .compact {
            VStack(spacing: Tokens.Space.s2) {
                HStack(spacing: Tokens.Space.s2) {
                    ForEach(SolutionCanvasTool.allCases) { tool in
                        toolButton(tool, expands: true)
                    }
                }

                HStack(spacing: Tokens.Space.s2) {
                    inkWidthMenu(compact: true)
                    compactActionButton(
                        "실행 취소", icon: "arrow.uturn.backward",
                        disabled: undoStack.isEmpty, action: undo)
                        .accessibilityHint("마지막 필기 또는 지우기를 되돌립니다")
                    compactActionButton(
                        "다시 실행", icon: "arrow.uturn.forward",
                        disabled: redoStack.isEmpty, action: redo)
                    compactActionButton(
                        "전체 지우기", icon: "trash",
                        disabled: drawing.strokes.isEmpty, action: clearDrawing)
                }

                HStack(spacing: Tokens.Space.s2) {
                    Text("캔버스 배율")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Tokens.text3)
                        .frame(width: 58, alignment: .leading)
                    compactActionButton(
                        "축소", icon: "minus.magnifyingglass",
                        disabled: zoom <= zoomRange.lowerBound + 0.01) {
                            setZoom(zoom - 0.5)
                        }
                    Button("\(Int((zoom * 100).rounded()))%") { setZoom(1) }
                        .font(.caption.monospacedDigit().weight(.semibold))
                        .frame(width: 54, height: 44)
                        .background(Tokens.primarySoft,
                                    in: RoundedRectangle(cornerRadius: Tokens.Radius.sm))
                        .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                            .strokeBorder(Tokens.line, lineWidth: 1))
                        .buttonStyle(.plain)
                        .accessibilityLabel("배율 초기화")
                    compactActionButton(
                        "확대", icon: "plus.magnifyingglass",
                        disabled: zoom >= zoomRange.upperBound - 0.01) {
                            setZoom(zoom + 0.5)
                        }
                }
            }
        } else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Tokens.Space.s2) {
                    ForEach(SolutionCanvasTool.allCases) { tool in
                        toolButton(tool)
                    }
                    inkWidthMenu(compact: false)

                    Button { undo() } label: {
                        Label("실행 취소", systemImage: "arrow.uturn.backward")
                    }
                    .frame(minHeight: 44)
                    .disabled(undoStack.isEmpty)
                    .accessibilityHint("마지막 필기 또는 지우기를 되돌립니다")

                    Button { redo() } label: {
                        Label("다시 실행", systemImage: "arrow.uturn.forward")
                    }
                    .frame(minHeight: 44)
                    .disabled(redoStack.isEmpty)

                    Button { clearDrawing() } label: {
                        Label("전체 지우기", systemImage: "trash")
                    }
                    .frame(minHeight: 44)
                    .disabled(drawing.strokes.isEmpty)

                    Divider().frame(height: 26)

                    Button { setZoom(zoom - 0.5) } label: {
                        Label("축소", systemImage: "minus.magnifyingglass")
                    }
                    .frame(minHeight: 44)
                    .disabled(zoom <= zoomRange.lowerBound + 0.01)
                    Button("\(Int((zoom * 100).rounded()))%") { setZoom(1) }
                        .font(.caption.monospacedDigit())
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("배율 초기화")
                    Button { setZoom(zoom + 0.5) } label: {
                        Label("확대", systemImage: "plus.magnifyingglass")
                    }
                    .frame(minHeight: 44)
                    .disabled(zoom >= zoomRange.upperBound - 0.01)
                }
                .font(.caption.weight(.semibold))
                .buttonStyle(.bordered)
                .controlSize(.regular)
            }
        }
    }

    private func inkWidthMenu(compact: Bool) -> some View {
        Menu {
            Picker("선 굵기", selection: $inkWidth) {
                Text("얇게").tag(CGFloat(2))
                Text("보통").tag(CGFloat(3))
                Text("굵게").tag(CGFloat(5))
            }
        } label: {
            Label(compact ? "\(Int(inkWidth))pt" : "선 \(Int(inkWidth))pt", systemImage: "lineweight")
                .font(.caption.weight(.semibold))
                .frame(minHeight: 44)
                .frame(minWidth: compact ? 62 : nil)
                .padding(.horizontal, compact ? 8 : 10)
                .background(Tokens.surface, in: RoundedRectangle(cornerRadius: Tokens.Radius.sm))
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                    .strokeBorder(Tokens.line, lineWidth: 1))
        }
        .accessibilityLabel("선 굵기 \(Int(inkWidth))포인트")
    }

    private func compactActionButton(
        _ label: String,
        icon: String,
        disabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .frame(width: 54, height: 44)
                .background(Tokens.surface,
                            in: RoundedRectangle(cornerRadius: Tokens.Radius.sm))
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                    .strokeBorder(Tokens.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.42 : 1)
        .accessibilityLabel(label)
    }

    private func toolButton(_ tool: SolutionCanvasTool, expands: Bool = false) -> some View {
        Button { selectedTool = tool } label: {
            Label(tool.label, systemImage: tool.icon)
                .font(.caption.weight(.semibold))
                .frame(minHeight: 44)
                .frame(maxWidth: expands ? .infinity : nil)
                .padding(.horizontal, 10)
                .foregroundStyle(selectedTool == tool ? Tokens.actionPrimary : Tokens.text2)
                .background(selectedTool == tool ? Tokens.primarySoft : Tokens.surface,
                            in: RoundedRectangle(cornerRadius: Tokens.Radius.sm))
                .overlay(RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                    .strokeBorder(selectedTool == tool ? Tokens.actionPrimary : Tokens.line,
                                  lineWidth: selectedTool == tool ? 1.5 : 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selectedTool == tool ? .isSelected : [])
    }

    private func recordChange(_ before: PKDrawing, _ after: PKDrawing) {
        guard before.dataRepresentation() != after.dataRepresentation() else { return }
        undoStack.append(before)
        if undoStack.count > 30 { undoStack.removeFirst() }
        redoStack.removeAll()
    }

    private func undo() {
        guard let previous = undoStack.popLast() else { return }
        redoStack.append(drawing)
        drawing = previous
    }

    private func redo() {
        guard let next = redoStack.popLast() else { return }
        undoStack.append(drawing)
        drawing = next
    }

    private func clearDrawing() {
        guard !drawing.strokes.isEmpty else { return }
        undoStack.append(drawing)
        if undoStack.count > 30 { undoStack.removeFirst() }
        redoStack.removeAll()
        drawing = PKDrawing()
    }
}

/// 확대·축소 컨테이너 — UIScrollView 가 격자+캔버스를 함께 줌한다.
/// 캔버스 자체 스크롤은 끄고(펜은 그리기, 두 손가락은 팬·핀치), 더블탭은 100% 복귀.
struct ZoomableNote<Content: View>: UIViewRepresentable {
    @Binding var zoom: CGFloat
    let zoomRange: ClosedRange<CGFloat>
    @ViewBuilder let content: Content

    func makeCoordinator() -> Coordinator { Coordinator(zoom: $zoom) }

    func makeUIView(context: Context) -> UIScrollView {
        let scroll = UIScrollView()
        scroll.minimumZoomScale = zoomRange.lowerBound
        scroll.maximumZoomScale = zoomRange.upperBound
        scroll.delegate = context.coordinator
        scroll.showsHorizontalScrollIndicator = false
        scroll.bouncesZoom = true
        scroll.backgroundColor = .clear

        // 호스팅 컨트롤러는 코디네이터가 강참조로 보유한다. 로컬 변수만 두면
        // makeUIView 가 끝나는 순간 해제돼서 updateUIView 로 rootView 를 갱신할
        // 길이 사라진다 — "손가락 허용" 토글이 먹지 않던 원인.
        let host = UIHostingController(rootView: content)
        context.coordinator.host = host
        host.view.backgroundColor = .clear
        scroll.addSubview(host.view)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            host.view.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor),
            host.view.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor),
        ])
        context.coordinator.hostView = host.view

        let doubleTap = UITapGestureRecognizer(target: context.coordinator,
                                               action: #selector(Coordinator.resetZoom(_:)))
        doubleTap.numberOfTapsRequired = 2
        doubleTap.numberOfTouchesRequired = 2   // 펜 두 번 탭(도구 전환)과 충돌하지 않게
        scroll.addGestureRecognizer(doubleTap)
        return scroll
    }

    func updateUIView(_ scroll: UIScrollView, context: Context) {
        // 내용물 갱신 — 손가락 허용 토글 같은 상태 변화가 실제 캔버스에 닿는 통로
        context.coordinator.host?.rootView = content
        if abs(scroll.zoomScale - zoom) > 0.01 {
            scroll.setZoomScale(zoom, animated: true)
        }
    }

    final class Coordinator: NSObject, UIScrollViewDelegate {
        @Binding var zoom: CGFloat
        weak var hostView: UIView?
        var host: UIHostingController<Content>?      // 강참조 (위 주석 참조)
        init(zoom: Binding<CGFloat>) { _zoom = zoom }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { hostView }

        func scrollViewDidZoom(_ scrollView: UIScrollView) {
            let z = scrollView.zoomScale
            DispatchQueue.main.async { if abs(self.zoom - z) > 0.01 { self.zoom = z } }
        }

        @objc func resetZoom(_ g: UITapGestureRecognizer) {
            (g.view as? UIScrollView)?.setZoomScale(1, animated: true)
        }
    }
}

extension PKDrawing {
    /// 채점 서버로 보낼 PNG. 빈 필기면 nil.
    func pngForGrading(scale: CGFloat = 2) -> Data? {
        guard !strokes.isEmpty else { return nil }
        let rect = bounds.insetBy(dx: -16, dy: -16)
        guard rect.width > 0, rect.height > 0 else { return nil }
        return image(from: rect, scale: scale).pngData()
    }
}
