(() => {
  "use strict";

  const form =
    document.getElementById(
      "nickname-change-form"
    );

  if (!form) return;

  const input =
    document.getElementById(
      "new-nickname"
    );
  const checkButton =
    document.getElementById(
      "nickname-check"
    );
  const submitButton =
    document.getElementById(
      "nickname-submit"
    );
  const proofInput =
    document.getElementById(
      "nickname-proof"
    );
  const result =
    document.getElementById(
      "nickname-check-result"
    );

  function resetCheck() {
    proofInput.value = "";
    submitButton.disabled = true;
    result.className =
      "nickname-check-result";
    result.textContent =
      "닉네임을 변경했다면 중복 확인을 다시 완료해주세요.";
  }

  input.addEventListener(
    "input",
    resetCheck
  );

  checkButton.addEventListener(
    "click",
    async () => {
      const nickname =
        input.value.trim();

      if (!nickname) {
        result.className =
          "nickname-check-result error";
        result.textContent =
          "새 닉네임을 입력해주세요.";
        return;
      }

      checkButton.disabled = true;
      result.className =
        "nickname-check-result";
      result.textContent =
        "중복 여부를 확인하고 있습니다.";

      try {
        const response =
          await fetch(
            form.dataset.checkUrl,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  requestId:
                    form.elements
                      .requestId
                      .value,
                  token:
                    form.elements
                      .token.value,
                  nickname,
                }),
            }
          );
        const data =
          await response.json();

        result.textContent =
          data.message ||
          "중복 확인 결과를 받지 못했습니다. 입력한 닉네임을 확인한 뒤 다시 확인해주세요.";

        if (
          response.ok &&
          data.available &&
          data.proof
        ) {
          input.value =
            data.nickname;
          proofInput.value =
            data.proof;
          result.className =
            "nickname-check-result success";
          submitButton.disabled =
            false;
        } else {
          proofInput.value = "";
          result.className =
            "nickname-check-result error";
          submitButton.disabled =
            true;
        }
      } catch (error) {
        result.className =
          "nickname-check-result error";
        result.textContent =
          "인터넷 연결을 확인한 뒤 중복 확인을 다시 눌러주세요. 입력한 닉네임은 그대로 남아 있습니다.";
      } finally {
        checkButton.disabled =
          false;
      }
    }
  );

  form.addEventListener(
    "submit",
    (event) => {
      if (!proofInput.value) {
        event.preventDefault();
        result.className =
          "nickname-check-result error";
        result.textContent =
          "닉네임 중복 확인을 먼저 완료해주세요.";
      }
    }
  );
})();
