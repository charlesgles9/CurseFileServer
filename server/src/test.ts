
 function encrypt(plaintext, shift):
    ciphertext = ""
    for each character in plaintext:
        if character is an alphabetic letter:
            if character is uppercase:
                shifted_character = (character + shift - 'A') % 26 + 'A'
            else:
                shifted_character = (character + shift - 'a') % 26 + 'a'
            ciphertext += shifted_character
        else:
            ciphertext += character
    return ciphertext
