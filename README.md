# Bible Challenge

Bible Challenge is a web application that allows users to upload their own questions, answers, and references to play a Jeopardy-style game. The app is designed to make learning and reviewing Bible knowledge fun and interactive.

---

## Features

- **Custom Question Upload**: Upload a `.tsv` file containing your own questions, answers, and references.
- **Interactive Game Board**: Play a Jeopardy-style game with a dynamic board that updates based on your uploaded questions.
- **Reset Board**: Reset the game board to start over or upload a new set of questions.

---

## How to Use

1. **Upload Questions**:
   - Prepare a `.tsv` (tab-separated values) file with the following format:
     ```
     Questions    Answer    Reference
     What is the first book of the Bible?    Genesis    Genesis 1:1
     ```
   - Click the "Upload File" button in the menu and select your `.tsv` file.

2. **Play the Game**:
   - The uploaded questions will populate the game board.
   - Click on a cell to view the question.
   - Reveal the answer and reference by clicking the "Reveal Answer" button.

3. **Reset the Board**:
   - Use the "Reset Board State" option in the menu to clear the board state without resetting the questions. Upload a new set of questions to replay.

---

## File Format for Upload

The uploaded `.tsv` file should have the following columns:

- **Questions**: The question text.
- **Answer**: The correct answer to the question.
- **Reference**: The Bible reference for the question.

---

## Future Enhancements
* Add a timer for each question to make the game more challenging.
* Implement multiplayer functionality for group play.
* Add a dark mode for better accessibility.
* Support for multiple languages.

---

## Acknowledgements
favico image: "https://www.flaticon.com/free-icons/book" : Book icons created by Good Ware - Flaticon