import UIKit
import PencilKit

func rgba(_ color: UIColor) -> String {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    guard color.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else {
        return "unresolved"
    }
    return String(
        format: "%.3f,%.3f,%.3f,%.3f",
        red,
        green,
        blue,
        alpha
    )
}

func pixel(_ image: UIImage, x: Int, y: Int) -> String {
    guard let cgImage = image.cgImage else { return "no-cg" }
    var bytes = [UInt8](repeating: 0, count: 4)
    guard let context = CGContext(
        data: &bytes,
        width: 1,
        height: 1,
        bitsPerComponent: 8,
        bytesPerRow: 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        return "no-context"
    }
    context.translateBy(x: CGFloat(-x), y: CGFloat(-(cgImage.height - y - 1)))
    context.draw(
        cgImage,
        in: CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height)
    )
    return bytes.map(String.init).joined(separator: ",")
}

for style in [UIUserInterfaceStyle.light, .dark] {
    UITraitCollection(userInterfaceStyle: style).performAsCurrent {
        let tool = PKInkingTool(.pen, color: .label, width: 5)
        let points = [
            PKStrokePoint(
                location: CGPoint(x: 10, y: 10),
                timeOffset: 0,
                size: CGSize(width: 5, height: 5),
                opacity: 1,
                force: 1,
                azimuth: 0,
                altitude: .pi / 2
            ),
            PKStrokePoint(
                location: CGPoint(x: 90, y: 90),
                timeOffset: 1,
                size: CGSize(width: 5, height: 5),
                opacity: 1,
                force: 1,
                azimuth: 0,
                altitude: .pi / 2
            ),
        ]
        let drawing = PKDrawing(strokes: [
            PKStroke(
                ink: PKInk(.pen, color: tool.color),
                path: PKStrokePath(controlPoints: points, creationDate: Date())
            )
        ])
        let transparent = drawing.image(
            from: CGRect(x: 0, y: 0, width: 100, height: 100),
            scale: 1
        )
        let whiteBackground = UIGraphicsImageRenderer(
            size: CGSize(width: 100, height: 100)
        ).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 100, height: 100))
            transparent.draw(in: CGRect(x: 0, y: 0, width: 100, height: 100))
        }
        print(
            style == .dark ? "dark" : "light",
            "tool=\(rgba(tool.color))",
            "transparentCenter=\(pixel(transparent, x: 50, y: 50))",
            "whiteCenter=\(pixel(whiteBackground, x: 50, y: 50))"
        )
    }
}
