//  CurriculumSpeechPlayer.swift
//  Matths
//
//  개념 narration 재생기. UI는 provider 종류를 모르고 문장 chunk와 checkpoint만
//  관리한다. 현재는 기기 AVSpeechSynthesizer, 향후에는 같은 protocol을 구현한
//  first-party signed audio provider를 주입한다. ElevenLabs 키는 앱에 넣지 않는다.

import AVFoundation
import Foundation
import SwiftUI

struct CurriculumSpeechRequest: Identifiable, Equatable {
    let id: UUID
    let conceptID: String
    let chunkID: String
    let text: String
    let locale: String

    init(
        id: UUID = UUID(),
        conceptID: String,
        chunkID: String,
        text: String,
        locale: String
    ) {
        self.id = id
        self.conceptID = conceptID
        self.chunkID = chunkID
        self.text = text
        self.locale = locale
    }
}

@MainActor
protocol CurriculumSpeechProviderDelegate: AnyObject {
    func curriculumSpeechProviderDidFinish(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest
    )
    func curriculumSpeechProviderDidCancel(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest
    )
    func curriculumSpeechProviderDidInterrupt(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest
    )
    func curriculumSpeechProvider(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest,
        didFail error: Error
    )
}

/// System/향후 server-backed ElevenLabs adapter가 공유하는 실제 주입 경계.
@MainActor
protocol CurriculumSpeechProviding: AnyObject {
    var delegate: (any CurriculumSpeechProviderDelegate)? { get set }
    var isAvailable: Bool { get }
    var isSpeaking: Bool { get }
    var isPaused: Bool { get }
    func speak(_ request: CurriculumSpeechRequest)
    @discardableResult func pause() -> Bool
    @discardableResult func resume() -> Bool
    func stop()
}

@MainActor
final class SystemCurriculumSpeechProvider: NSObject, CurriculumSpeechProviding {
    weak var delegate: (any CurriculumSpeechProviderDelegate)?

    private let synthesizer: AVSpeechSynthesizer
    private var interruptionObserver: NSObjectProtocol?
    private var activeRequest: CurriculumSpeechRequest?
    private var activeUtterance: AVSpeechUtterance?

    override init() {
        synthesizer = AVSpeechSynthesizer()
        super.init()
        synthesizer.delegate = self
        #if os(iOS) || os(tvOS) || os(watchOS)
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { [weak self] notification in
            let typeValue = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            guard typeValue == AVAudioSession.InterruptionType.began.rawValue else { return }
            Task { @MainActor [weak self] in self?.handleInterruption() }
        }
        #endif
    }

    deinit {
        if let interruptionObserver {
            NotificationCenter.default.removeObserver(interruptionObserver)
        }
    }

    var isAvailable: Bool { !AVSpeechSynthesisVoice.speechVoices().isEmpty }
    var isSpeaking: Bool { synthesizer.isSpeaking }
    var isPaused: Bool { synthesizer.isPaused }

    func speak(_ request: CurriculumSpeechRequest) {
        stop()
        activeRequest = request
        do {
            try activateAudioSession()
        } catch {
            activeRequest = nil
            activeUtterance = nil
            deactivateAudioSession()
            delegate?.curriculumSpeechProvider(self, request: request, didFail: error)
            return
        }

        let utterance = AVSpeechUtterance(string: request.text)
        utterance.voice = Self.preferredFemaleVoice(locale: request.locale)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1
        utterance.preUtteranceDelay = 0.04
        activeUtterance = utterance
        synthesizer.speak(utterance)
    }

    @discardableResult
    func pause() -> Bool {
        guard synthesizer.isSpeaking, !synthesizer.isPaused else { return false }
        return synthesizer.pauseSpeaking(at: .word)
    }

    @discardableResult
    func resume() -> Bool {
        guard synthesizer.isPaused else { return false }
        do {
            try activateAudioSession()
        } catch {
            if let activeRequest {
                delegate?.curriculumSpeechProvider(self, request: activeRequest, didFail: error)
            }
            return false
        }
        return synthesizer.continueSpeaking()
    }

    func stop() {
        activeRequest = nil
        activeUtterance = nil
        if synthesizer.isSpeaking || synthesizer.isPaused {
            synthesizer.stopSpeaking(at: .immediate)
        }
        deactivateAudioSession()
    }

    static func preferredFemaleVoice(locale: String = "ko-KR") -> AVSpeechSynthesisVoice? {
        let language = locale.lowercased()
        let korean = AVSpeechSynthesisVoice.speechVoices().filter {
            $0.language.lowercased().hasPrefix(language.split(separator: "-").first.map(String.init) ?? "ko")
        }
        return korean.first(where: { $0.gender == .female })
            ?? korean.first(where: { $0.language.caseInsensitiveCompare(locale) == .orderedSame })
            ?? korean.first
            ?? AVSpeechSynthesisVoice(language: locale)
    }

    private func handleInterruption() {
        guard let activeRequest, activeUtterance != nil,
              synthesizer.isSpeaking || synthesizer.isPaused else { return }
        _ = synthesizer.pauseSpeaking(at: .word)
        delegate?.curriculumSpeechProviderDidInterrupt(self, request: activeRequest)
    }

    private func activateAudioSession() throws {
        #if os(iOS) || os(tvOS) || os(watchOS)
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try session.setActive(true, options: [])
        #endif
    }

    private func deactivateAudioSession() {
        #if os(iOS) || os(tvOS) || os(watchOS)
        do {
            try AVAudioSession.sharedInstance().setActive(
                false,
                options: [.notifyOthersOnDeactivation]
            )
        } catch {
            NSLog("[Matths] curriculum narration audio session deactivation failed: %@", error.localizedDescription)
        }
        #endif
    }
}

extension SystemCurriculumSpeechProvider: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didFinish utterance: AVSpeechUtterance
    ) {
        Task { @MainActor [weak self] in
            guard let self, let request = self.activeRequest,
                  self.activeUtterance === utterance else { return }
            self.activeRequest = nil
            self.activeUtterance = nil
            self.deactivateAudioSession()
            self.delegate?.curriculumSpeechProviderDidFinish(self, request: request)
        }
    }

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didCancel utterance: AVSpeechUtterance
    ) {
        Task { @MainActor [weak self] in
            guard let self, let request = self.activeRequest,
                  self.activeUtterance === utterance else { return }
            self.activeRequest = nil
            self.activeUtterance = nil
            self.deactivateAudioSession()
            self.delegate?.curriculumSpeechProviderDidCancel(self, request: request)
        }
    }
}

protocol CurriculumNarrationCheckpointStoring {
    func load(conceptID: String, maximum: Int, accountSlot: String) -> Int
    func save(_ index: Int, conceptID: String, accountSlot: String)
    func clear(conceptID: String, accountSlot: String)
}

struct UserDefaultsCurriculumNarrationCheckpointStore: CurriculumNarrationCheckpointStoring {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load(conceptID: String, maximum: Int, accountSlot: String) -> Int {
        let index = defaults.integer(forKey: key(conceptID, accountSlot: accountSlot))
        return index >= 0 && index < maximum ? index : 0
    }

    func save(_ index: Int, conceptID: String, accountSlot: String) {
        defaults.set(index, forKey: key(conceptID, accountSlot: accountSlot))
    }

    func clear(conceptID: String, accountSlot: String) {
        defaults.removeObject(forKey: key(conceptID, accountSlot: accountSlot))
    }

    private func key(_ conceptID: String, accountSlot: String) -> String {
        DataScope.defaultsKey(
            "matths.curriculumNarration.\(conceptID)",
            for: accountSlot
        )
    }
}

enum CurriculumNarrationPlaybackState: String, Equatable {
    case idle
    case playing
    case paused
    case completed
    case failed
}

@MainActor
final class CurriculumNarrationPlayer: NSObject, ObservableObject {
    @Published private(set) var state: CurriculumNarrationPlaybackState = .idle
    @Published private(set) var currentChunkIndex = 0
    @Published private(set) var currentSceneID: String?
    @Published private(set) var message = "기기의 한국어 여성 음성을 우선 사용합니다."

    private let provider: any CurriculumSpeechProviding
    private let checkpoints: any CurriculumNarrationCheckpointStoring
    private let accountSlotProvider: () -> String
    private var story: CurriculumStudentStory?
    private var chunks: [CurriculumNarrationChunk] = []
    private var watchdog: Task<Void, Never>?
    private var activeRequestID: UUID?
    private var capturedAccountSlot: String?

    init(
        provider: (any CurriculumSpeechProviding)? = nil,
        checkpoints: any CurriculumNarrationCheckpointStoring =
            UserDefaultsCurriculumNarrationCheckpointStore(),
        accountSlotProvider: @escaping () -> String = { DataScope.slot }
    ) {
        let resolvedProvider = provider ?? SystemCurriculumSpeechProvider()
        self.provider = resolvedProvider
        self.checkpoints = checkpoints
        self.accountSlotProvider = accountSlotProvider
        super.init()
        resolvedProvider.delegate = self
    }

    var currentChunk: CurriculumNarrationChunk? {
        chunks.indices.contains(currentChunkIndex) ? chunks[currentChunkIndex] : nil
    }

    var hasProgress: Bool { currentChunkIndex > 0 || state == .completed }

    var primaryButtonLabel: String {
        switch state {
        case .playing: "잠시 멈추기"
        case .paused: "이어서 듣기"
        case .completed: "다시 듣기"
        case .failed: "음성 사용 불가"
        case .idle: "5분 해설 듣기"
        }
    }

    var primaryButtonSymbol: String {
        switch state {
        case .playing: "pause.fill"
        case .completed: "arrow.counterclockwise"
        case .failed: "speaker.slash.fill"
        case .idle, .paused: "play.fill"
        }
    }

    func load(_ story: CurriculumStudentStory) {
        let nextAccountSlot = accountSlotProvider()
        guard self.story?.narrationCheckpointID != story.narrationCheckpointID
                || capturedAccountSlot != nextAccountSlot else { return }
        stopAndPreserve()
        self.story = story
        capturedAccountSlot = nextAccountSlot
        chunks = CurriculumNarrationChunker.chunks(for: story)
        currentChunkIndex = checkpoints.load(
            conceptID: story.narrationCheckpointID,
            maximum: chunks.count,
            accountSlot: nextAccountSlot
        )
        currentSceneID = currentChunk?.sceneID
        state = currentChunkIndex > 0 ? .paused : .idle
        message = currentChunkIndex > 0
            ? "멈춘 문장부터 이어 들을 수 있습니다."
            : "기기의 한국어 여성 음성을 우선 사용합니다."
    }

    func toggle() {
        state == .playing ? pause() : play()
    }

    func play() {
        guard story != nil, provider.isAvailable, !chunks.isEmpty else {
            state = .failed
            message = "이 기기에서는 음성 읽기를 사용할 수 없습니다. 해설 원문으로 학습해 주세요."
            return
        }
        if state == .completed {
            currentChunkIndex = 0
            clearCheckpoint()
        }
        if state == .paused, provider.isPaused {
            if provider.resume() {
                state = .playing
                currentSceneID = currentChunk?.sceneID
                message = progressMessage
                startWatchdog()
                return
            }
            if state == .failed { return }
            activeRequestID = nil
        }
        speakCurrent()
    }

    func pause() {
        guard state == .playing, story != nil else { return }
        let pausedAtWord = provider.pause()
        if !pausedAtWord {
            activeRequestID = nil
            provider.stop()
        }
        saveCheckpoint(currentChunkIndex)
        cancelWatchdog()
        state = .paused
        message = "현재 문장을 보존했습니다. 문장 경계부터 이어집니다."
    }

    func pauseForInterruption() {
        guard state == .playing, story != nil else { return }
        activeRequestID = nil
        provider.stop()
        saveCheckpoint(currentChunkIndex)
        cancelWatchdog()
        state = .paused
        message = "앱이 비활성화되어 멈췄습니다. 현재 문장부터 이어 들을 수 있습니다."
    }

    func restart() {
        guard story != nil else { return }
        activeRequestID = nil
        provider.stop()
        cancelWatchdog()
        clearCheckpoint()
        currentChunkIndex = 0
        currentSceneID = chunks.first?.sceneID
        state = .idle
        message = "처음부터 다시 재생합니다."
        play()
    }

    func stopAndPreserve() {
        if story != nil, state == .playing || state == .paused {
            saveCheckpoint(currentChunkIndex)
        }
        activeRequestID = nil
        provider.stop()
        cancelWatchdog()
    }

    func unload() {
        stopAndPreserve()
        story = nil
        chunks = []
        capturedAccountSlot = nil
        currentChunkIndex = 0
        currentSceneID = nil
        state = .idle
        message = "기기의 한국어 여성 음성을 우선 사용합니다."
    }

    private var progressMessage: String {
        guard let chunk = currentChunk else { return "5분 해설을 준비하고 있습니다." }
        return "\(chunk.sceneTitle) · 문장 \(currentChunkIndex + 1) / \(chunks.count)"
    }

    private func speakCurrent() {
        guard let story else { return }
        guard let chunk = currentChunk else {
            state = .completed
            currentSceneID = nil
            activeRequestID = nil
            clearCheckpoint()
            message = "5분 해설을 모두 들었습니다."
            return
        }
        state = .playing
        currentSceneID = chunk.sceneID
        message = progressMessage
        saveCheckpoint(currentChunkIndex)
        let request = CurriculumSpeechRequest(
            conceptID: story.conceptID,
            chunkID: chunk.id,
            text: chunk.text,
            locale: "ko-KR"
        )
        activeRequestID = request.id
        startWatchdog()
        provider.speak(request)
    }

    private func startWatchdog() {
        cancelWatchdog()
        guard let chunk = currentChunk else { return }
        let seconds = max(20, Double(chunk.text.count) * 0.30)
        watchdog = Task { [weak self] in
            try? await Task.sleep(for: .seconds(seconds))
            guard !Task.isCancelled, let self, self.state == .playing,
                  self.story != nil else { return }
            self.activeRequestID = nil
            self.provider.stop()
            self.saveCheckpoint(self.currentChunkIndex)
            self.state = .paused
            self.message = "음성이 오래 멈춰 현재 문장을 보존했습니다. 이어 듣기를 눌러 다시 시작해 주세요."
        }
    }

    private func cancelWatchdog() {
        watchdog?.cancel()
        watchdog = nil
    }

    private func saveCheckpoint(_ index: Int) {
        guard let story, let capturedAccountSlot else { return }
        checkpoints.save(
            index,
            conceptID: story.narrationCheckpointID,
            accountSlot: capturedAccountSlot
        )
    }

    private func clearCheckpoint() {
        guard let story, let capturedAccountSlot else { return }
        checkpoints.clear(
            conceptID: story.narrationCheckpointID,
            accountSlot: capturedAccountSlot
        )
    }
}

extension CurriculumNarrationPlayer: CurriculumSpeechProviderDelegate {
    func curriculumSpeechProviderDidFinish(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest
    ) {
        guard activeRequestID == request.id, state == .playing, story != nil else { return }
        activeRequestID = nil
        cancelWatchdog()
        currentChunkIndex += 1
        saveCheckpoint(currentChunkIndex)
        speakCurrent()
    }

    func curriculumSpeechProviderDidCancel(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest
    ) {
        guard activeRequestID == request.id, state == .playing, story != nil else { return }
        activeRequestID = nil
        cancelWatchdog()
        saveCheckpoint(currentChunkIndex)
        state = .paused
        message = "음성이 중단되어 현재 문장을 보존했습니다."
    }

    func curriculumSpeechProviderDidInterrupt(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest
    ) {
        guard activeRequestID == request.id, state == .playing, story != nil else { return }
        activeRequestID = nil
        provider.stop()
        cancelWatchdog()
        saveCheckpoint(currentChunkIndex)
        state = .paused
        message = "다른 음성이나 통화로 멈췄습니다. 현재 문장부터 이어 들을 수 있습니다."
    }

    func curriculumSpeechProvider(
        _ provider: any CurriculumSpeechProviding,
        request: CurriculumSpeechRequest,
        didFail error: Error
    ) {
        guard activeRequestID == request.id else { return }
        activeRequestID = nil
        cancelWatchdog()
        state = .failed
        message = "음성을 재생하지 못했습니다. 해설 원문으로 계속 학습해 주세요."
    }
}
