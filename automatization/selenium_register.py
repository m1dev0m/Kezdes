import os
import re
import time
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def env_bool(key, default=False):
    value = os.environ.get(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def wait_input_by_label(driver, label_text, timeout=15):
    xpath = f"//label[normalize-space()='{label_text}']/following::input[1]"
    return WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((By.XPATH, xpath)))


def wait_button_by_text(driver, text, timeout=15):
    xpath = f\"//button[normalize-space()='{text}']\"
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.XPATH, xpath)))


def wait_contains_text(driver, text, timeout=15):
    xpath = f\"//*[contains(normalize-space(), '{text}')]\"
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.XPATH, xpath)))


def get_debug_otp_code(driver):
    try:
        node = WebDriverWait(driver, 3).until(
            EC.presence_of_element_located((By.XPATH, \"//*[contains(normalize-space(),'Dev OTP code')]\"))
        )
        match = re.search(r\"(\\d{4,8})\", node.text)
        if match:
            return match.group(1)
    except Exception:
        return None
    return None


def main():
    base_url = os.environ.get(\"BASE_URL\", \"http://localhost:5173\").rstrip(\"/\")
    role = os.environ.get(\"ROLE\", \"customer\").strip().lower()
    otp_code_env = os.environ.get(\"OTP_CODE\")
    headless = env_bool(\"HEADLESS\", True)

    seed = os.environ.get(\"SEED\") or str(random.randint(100000, 999999))
    username = os.environ.get(\"USERNAME\", f\"user{seed}\")
    email = os.environ.get(\"EMAIL\", f\"user{seed}@test.local\")
    phone = os.environ.get(\"PHONE\", \"+77000000000\")
    password = os.environ.get(\"PASSWORD\", \"Testpass123!\")

    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument(\"--headless=new\")
    options.add_argument(\"--window-size=1280,900\")
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 20)

    try:
        driver.get(f\"{base_url}/register\")

        wait_input_by_label(driver, \"Логин\").send_keys(username)
        wait_input_by_label(driver, \"Электронная почта\").send_keys(email)
        wait_input_by_label(driver, \"Телефон\").send_keys(phone)
        wait_input_by_label(driver, \"Пароль\").send_keys(password)
        wait_input_by_label(driver, \"Подтвердите пароль\").send_keys(password)

        wait_button_by_text(driver, \"Отправить код\").click()

        wait_input_by_label(driver, \"Код подтверждения\")

        otp_code = get_debug_otp_code(driver) or otp_code_env
        if not otp_code:
            raise RuntimeError(\"OTP code required. Set OTP_CODE env or enable debug code in response.\")

        wait_input_by_label(driver, \"Код подтверждения\").send_keys(otp_code)
        wait_button_by_text(driver, \"Подтвердить и войти\").click()

        wait.until(lambda d: \"role-selection\" in d.current_url)

        if role == \"owner\":
            wait_contains_text(driver, \"Настроить ресторан\").click()
            wait.until(lambda d: \"/setup-restaurant\" in d.current_url or \"/register-restaurant\" in d.current_url)
        else:
            wait_contains_text(driver, \"Продолжить как гость\").click()
            wait.until(lambda d: \"/restaurants\" in d.current_url)

        time.sleep(1)
        print(\"OK\")
    finally:
        driver.quit()


if __name__ == \"__main__\":
    main()
