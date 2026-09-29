/* =========================================================
   LEGACY PASSWORD ENCODING
   The old system stored passwords in tbluserlogin.fuserpwd in
   a reversible format: for every character, a 4-digit number
   (ASCII code + seed, zero padded) followed by 1 random digit.
   The seed comes from USER_PWD_SEED in .env.
========================================================= */

export const decryptPwd = (
  encryptedPwd: string,
  userPwdSeed: number,
): string => {
  if (!encryptedPwd) {
    return "";
  }

  let decryptedPwd = "";

  for (let i = 0; i < encryptedPwd.length; i += 5) {
    const encryptedChar = encryptedPwd.substring(i, i + 4);

    if (encryptedChar.length < 4) {
      continue;
    }

    const asciiValue = parseInt(encryptedChar, 10) - userPwdSeed;

    decryptedPwd += String.fromCharCode(asciiValue);
  }

  return decryptedPwd;
};

export const encryptPwd = (
  password: string,
  userPwdSeed: number,
): string => {
  if (!password) {
    return "";
  }

  let encryptedPwd = "";

  for (const char of password) {
    const asciiValue = char.charCodeAt(0);
    const formattedValue = String(asciiValue + userPwdSeed).padStart(4, "0");
    const randomNumber = Math.floor(Math.random() * 10);

    encryptedPwd += formattedValue + randomNumber;
  }

  return encryptedPwd;
};
