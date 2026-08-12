import Foundation

@main
struct ServerTokenOwnershipCases {
    static func main() {
        precondition(ServerTokenOwnership.shouldClear(
            requestToken: "account-a-token",
            currentToken: "account-a-token"))
        precondition(!ServerTokenOwnership.shouldClear(
            requestToken: "account-a-token",
            currentToken: "account-b-token"))
        precondition(!ServerTokenOwnership.shouldClear(
            requestToken: nil,
            currentToken: "account-b-token"))
        precondition(!ServerTokenOwnership.shouldClear(
            requestToken: "",
            currentToken: "account-b-token"))
        precondition(!ServerTokenOwnership.shouldClear(
            requestToken: "account-a-token",
            currentToken: nil))
        precondition(ServerTokenOwnership.restoredSessionAction(
            authProvider: "server", hasToken: true) == .keep)
        precondition(ServerTokenOwnership.restoredSessionAction(
            authProvider: "server", hasToken: false) == .requireSignIn)
        precondition(ServerTokenOwnership.restoredSessionAction(
            authProvider: nil, hasToken: true) == .discardOrphanedToken)
        precondition(ServerTokenOwnership.restoredSessionAction(
            authProvider: "guest", hasToken: false) == .keep)
        print("Stale 401 responses cannot clear a newer account token.")
    }
}
