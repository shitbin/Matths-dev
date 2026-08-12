//
//  ExperimentalLocalModelCatalog.swift
//  Matths
//
//  검증되지 않은 로컬 모델을 사용자 설정에 바로 노출하지 않기 위한 격리 장벽이다.
//  이 파일의 후보는 DEBUG 실기 벤치마크 대상으로만 쓰며, ModelDownloader의 제품
//  목록에는 연결하지 않는다. 런타임·가중치·기기 메모리 핀이 모두 맞아야 실험을
//  시작할 수 있다.
//

import Foundation

enum ExperimentalLocalModelCatalog {
    struct SourcePin: Equatable, Sendable {
        let repository: String
        let revision: String
        let declaredLicenseSPDX: String
        let isPublic: Bool
        let isGated: Bool
        let hasStandaloneLicenseFile: Bool
    }

    struct ArtifactPin: Equatable, Sendable {
        let id: String
        let repository: String
        let revision: String
        let file: String
        let byteCount: UInt64
        let sha256: String
        let quantization: String
        let minimumPhysicalMemoryBytes: UInt64
    }

    struct Candidate: Equatable, Sendable {
        let id: String
        let displayName: String
        let totalParametersBillions: Double
        let activeParametersBillions: Double
        let modality: String
        let ggufArchitecture: String
        let source: SourcePin
        let artifacts: [ArtifactPin]
        let userSelectable: Bool
        let shippingEligible: Bool
    }

    enum BenchmarkBlockReason: String, Equatable, Sendable {
        case releaseBuild
        case unreviewedRuntime
        case unsupportedRuntimeArchitecture
        case unknownArtifact
        case artifactIntegrityMismatch
        case insufficientPhysicalMemory
    }

    enum BenchmarkDecision: Equatable, Sendable {
        case blocked(BenchmarkBlockReason)
        case eligibleForControlledBenchmark(artifactID: String)
    }

    // 2026-08-12에 앱에 포함된 공식 llama.cpp b10159 XCFramework의 commit 문자열.
    // 이 빌드는 bailingmoe/bailingmoe2만 포함하고 bailingmoe3는 포함하지 않는다.
    static let bundledLlamaCommit = "f95de9776b5b90dd993f36d2bd66a3eee21c887f"

    // ggml-org/llama.cpp PR #26608에서 Ling-3.0-tiny Q-LoRA 경로까지 포함해
    // 검토한 정확한 실험 commit. upstream release가 나오면 새 commit으로 다시
    // 검증하고 이 핀을 갱신해야 한다.
    static let reviewedBailingMoE3RuntimeCommit =
        "d8d862521e9ad842f2b47f3b392b039317782aa0"

    static let ling3Tiny = Candidate(
        id: "ling-3.0-tiny",
        displayName: "Ling 3.0 tiny (실험 후보)",
        totalParametersBillions: 7.9,
        activeParametersBillions: 1.3,
        modality: "text-only",
        ggufArchitecture: "bailingmoe3",
        source: SourcePin(
            repository: "inclusionAI/Ling-3.0-tiny",
            revision: "a2ee06c0f2de5b171701aee7f73f70a1da75483b",
            declaredLicenseSPDX: "MIT",
            isPublic: true,
            isGated: false,
            // 해당 revision은 README front matter로 MIT를 선언하지만 LICENSE라는
            // 독립 파일은 없다. 배포 전에는 MIT 본문·저작권 고지를 패키지에 넣고
            // 최종 라이선스 검토를 받아야 한다.
            hasStandaloneLicenseFile: false
        ),
        artifacts: [
            ArtifactPin(
                id: "ling3-tiny-q3-k-m-debug",
                repository: "bloomer010/Ling-3.0-tiny-GGUF",
                revision: "cc923f2ef87899f06552051007a6279b35a99bfb",
                file: "Ling-3.0-tiny-Q3_K_M.gguf",
                byteCount: 3_841_570_656,
                sha256: "3481953f64fa2dad7e22a254faba1681ab5b83061ac378ea144704fe6019bba2",
                quantization: "Q3_K_M",
                minimumPhysicalMemoryBytes: 8 * 1_024 * 1_024 * 1_024
            ),
            ArtifactPin(
                id: "ling3-tiny-q4-k-m-debug",
                repository: "bloomer010/Ling-3.0-tiny-GGUF",
                revision: "cc923f2ef87899f06552051007a6279b35a99bfb",
                file: "Ling-3.0-tiny-Q4_K_M.gguf",
                byteCount: 4_823_894_880,
                sha256: "9842cce7c1a07ad4adefd2b79a1035710ff196576d89128eade29351b79c8e68",
                quantization: "Q4_K_M",
                minimumPhysicalMemoryBytes: 16 * 1_024 * 1_024 * 1_024
            )
        ],
        // UI에 연결하면 아직 열 수 없는 모델이 제품 설정에 노출된다.
        userSelectable: false,
        // upstream runtime release, 실기 안정성, 한국 고교 수학 품질, MIT notice가
        // 모두 닫히기 전에는 Release 선택지가 될 수 없다.
        shippingEligible: false
    )

    static func benchmarkDecision(
        buildIsDebug: Bool,
        runtimeCommit: String,
        runtimeArchitectures: Set<String>,
        physicalMemoryBytes: UInt64,
        artifactID: String,
        artifactByteCount: UInt64,
        artifactSHA256: String
    ) -> BenchmarkDecision {
        guard buildIsDebug else { return .blocked(.releaseBuild) }
        guard runtimeCommit == reviewedBailingMoE3RuntimeCommit else {
            return .blocked(.unreviewedRuntime)
        }
        guard runtimeArchitectures.contains(ling3Tiny.ggufArchitecture) else {
            return .blocked(.unsupportedRuntimeArchitecture)
        }
        guard let artifact = ling3Tiny.artifacts.first(where: { $0.id == artifactID }) else {
            return .blocked(.unknownArtifact)
        }
        guard artifact.byteCount == artifactByteCount,
              artifact.sha256.caseInsensitiveCompare(artifactSHA256) == .orderedSame else {
            return .blocked(.artifactIntegrityMismatch)
        }
        guard physicalMemoryBytes >= artifact.minimumPhysicalMemoryBytes else {
            return .blocked(.insufficientPhysicalMemory)
        }
        return .eligibleForControlledBenchmark(artifactID: artifact.id)
    }
}
