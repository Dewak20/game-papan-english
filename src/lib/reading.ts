/**
 * Bank bacaan (reading) untuk game Reading Race.
 * Dikelompokkan per level agar kesulitan bisa dipilih guru.
 *
 * Setiap bacaan punya 2–3 pertanyaan pemahaman. Tiap pertanyaan punya 3 pilihan
 * (satu benar) — cukup menantang, tapi tetap cepat untuk permainan rebutan.
 */

export type ReadingLevel = "easy" | "medium" | "hard";

export interface ReadingQuestion {
  q: string;
  options: [string, string, string];
  /** indeks jawaban benar (0–2) */
  answer: 0 | 1 | 2;
}

export interface ReadingPassage {
  id: string;
  title: string;
  level: ReadingLevel;
  text: string;
  questions: ReadingQuestion[];
}

export const readingPassages: ReadingPassage[] = [
  /* ------------------------------- EASY ------------------------------- */
  {
    id: "r-my-day",
    title: "My Day",
    level: "easy",
    text: "Every morning, I wake up at five o'clock. I pray, then I take a shower. After that, I have breakfast with my family. I usually eat rice and eggs. At six thirty, I go to school by bicycle. I study at school until one o'clock. In the afternoon, I do my homework and help my mother. I go to bed at nine o'clock.",
    questions: [
      {
        q: "What time does the writer wake up?",
        options: ["Five o'clock", "Six o'clock", "Seven o'clock"],
        answer: 0,
      },
      {
        q: "How does the writer go to school?",
        options: ["By bicycle", "By bus", "On foot"],
        answer: 0,
      },
      {
        q: "What does the writer do in the afternoon?",
        options: ["Homework and help mother", "Go to the market", "Play football"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-my-cat",
    title: "My Cat",
    level: "easy",
    text: "I have a cat. Its name is Snowy. It is white and very soft. Snowy likes to sleep on my bed. It eats fish and drinks milk. Every evening, I play with Snowy in the garden. Snowy can run very fast. I love my cat very much.",
    questions: [
      {
        q: "What colour is Snowy?",
        options: ["White", "Black", "Brown"],
        answer: 0,
      },
      {
        q: "What does Snowy like to eat?",
        options: ["Fish", "Rice", "Bread"],
        answer: 0,
      },
      {
        q: "Where does the writer play with Snowy?",
        options: ["In the garden", "In the kitchen", "At school"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-my-school",
    title: "My School",
    level: "easy",
    text: "My school is SMP Dharma Wiweka. It is big and clean. There are many classrooms, a library, and a laboratory. My favourite place is the library because I love reading books. The teachers are kind and friendly. I have many friends at school. I am happy to study here.",
    questions: [
      {
        q: "What is the writer's favourite place?",
        options: ["The library", "The laboratory", "The canteen"],
        answer: 0,
      },
      {
        q: "Why does the writer like that place?",
        options: ["Because he loves reading", "Because it is big", "Because it is clean"],
        answer: 0,
      },
      {
        q: "How are the teachers?",
        options: ["Kind and friendly", "Strict and cold", "Quiet and shy"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-fruits",
    title: "Fruits",
    level: "easy",
    text: "Fruits are good for our health. They have a lot of vitamins. Bananas give us energy. Oranges have vitamin C. Watermelons have a lot of water, so they are good when the weather is hot. Apples are sweet and crunchy. We should eat fruits every day.",
    questions: [
      {
        q: "Which fruit has a lot of water?",
        options: ["Watermelon", "Banana", "Apple"],
        answer: 0,
      },
      {
        q: "What do bananas give us?",
        options: ["Energy", "Vitamin C", "Water"],
        answer: 0,
      },
      {
        q: "How often should we eat fruits?",
        options: ["Every day", "Once a month", "Never"],
        answer: 0,
      },
    ],
  },

  /* ------------------------------ MEDIUM ------------------------------ */
  {
    id: "r-zoo",
    title: "A Trip to the Zoo",
    level: "medium",
    text: "Last Sunday, my family and I went to the zoo. We left home at seven in the morning. At the zoo, we saw many animals. The elephants were very big. The monkeys were funny and jumped from tree to tree. My little sister liked the giraffes because they had long necks. We took many photos. We went home in the afternoon. It was a wonderful day.",
    questions: [
      {
        q: "When did they go to the zoo?",
        options: ["Last Sunday", "Last Saturday", "Last Monday"],
        answer: 0,
      },
      {
        q: "Why did the sister like the giraffes?",
        options: ["They had long necks", "They were funny", "They were very big"],
        answer: 0,
      },
      {
        q: "How did they feel about the day?",
        options: ["It was wonderful", "It was boring", "It was tiring and sad"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-honest-boy",
    title: "The Honest Boy",
    level: "medium",
    text: "One day, a boy found a wallet on the street. He opened it and saw a lot of money and an identity card. He did not keep the money. Instead, he took the wallet to the police station. The police found the owner and called him. The owner was very happy and thanked the boy. Honesty is always the best choice.",
    questions: [
      {
        q: "What did the boy find?",
        options: ["A wallet", "A bag", "A phone"],
        answer: 0,
      },
      {
        q: "What did he do with it?",
        options: ["He took it to the police", "He kept the money", "He threw it away"],
        answer: 0,
      },
      {
        q: "What is the message of the story?",
        options: ["Honesty is the best choice", "Money is everything", "Never help others"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-recycling",
    title: "Recycling",
    level: "medium",
    text: "Recycling is important for our environment. We can recycle paper, plastic, and glass. When we recycle paper, we save trees. When we recycle plastic, we reduce rubbish in the sea. We should also use reusable bags when we go shopping. Recycling keeps our planet clean and healthy for the future.",
    questions: [
      {
        q: "What materials can we recycle?",
        options: ["Paper, plastic, and glass", "Only paper", "Only glass"],
        answer: 0,
      },
      {
        q: "What happens when we recycle paper?",
        options: ["We save trees", "We save water", "We save money"],
        answer: 0,
      },
      {
        q: "What bags should we use when shopping?",
        options: ["Reusable bags", "Plastic bags", "Paper bags"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-teacher",
    title: "My Favourite Teacher",
    level: "medium",
    text: "Mrs. Rina is my English teacher. She is tall and always smiles. Her lessons are fun because she uses games and songs. She is patient when we make mistakes. She always says, \"Practice makes perfect.\" Because of her, I am not afraid to speak English anymore.",
    questions: [
      {
        q: "What subject does Mrs. Rina teach?",
        options: ["English", "Mathematics", "Science"],
        answer: 0,
      },
      {
        q: "Why are her lessons fun?",
        options: ["She uses games and songs", "She gives no homework", "She is tall"],
        answer: 0,
      },
      {
        q: "What does she always say?",
        options: ["Practice makes perfect", "Study is boring", "Be quiet please"],
        answer: 0,
      },
    ],
  },

  /* ------------------------------- HARD ------------------------------- */
  {
    id: "r-reading-habit",
    title: "The Importance of Reading",
    level: "hard",
    text: "Reading is one of the most useful habits a student can have. Through reading, we can travel to other places and learn about different cultures without leaving our room. Books also improve our vocabulary and our writing. Moreover, reading trains us to focus for a long time. Many successful people say that reading every day changed their lives. Therefore, we should set aside at least twenty minutes a day to read.",
    questions: [
      {
        q: "What is the main idea of the text?",
        options: [
          "Reading is a very useful habit",
          "Reading is boring for students",
          "Books are too expensive to buy",
        ],
        answer: 0,
      },
      {
        q: "What can reading improve?",
        options: ["Vocabulary and writing", "Only speaking", "Only listening"],
        answer: 0,
      },
      {
        q: "How long should we read every day?",
        options: ["At least twenty minutes", "At least two hours", "At least five minutes"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-technology",
    title: "Technology in Education",
    level: "hard",
    text: "Technology has changed the way students learn. Today, students can watch lessons on video, join online classes, and find information in seconds. However, technology also has disadvantages. Some students become lazy because they copy answers from the internet. Others spend too much time playing games instead of studying. The key is to use technology wisely.",
    questions: [
      {
        q: "What is one advantage of technology?",
        options: [
          "Students can find information quickly",
          "Students never study at all",
          "Students sleep much more",
        ],
        answer: 0,
      },
      {
        q: "What is one disadvantage?",
        options: [
          "Some students copy answers from the internet",
          "All books disappear",
          "Teachers stop working",
        ],
        answer: 0,
      },
      {
        q: "What is the writer's advice?",
        options: ["Use technology wisely", "Avoid technology completely", "Never use the internet"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-environment",
    title: "Saving the Environment",
    level: "hard",
    text: "Every day, millions of tons of rubbish are thrown into rivers and oceans. Plastic takes hundreds of years to break down, and it harms fish and birds. To help, we can start with small actions: bring our own bottle, say no to plastic straws, and separate our rubbish at home. If everyone does a little, the result will be very big. Our planet needs us now.",
    questions: [
      {
        q: "How long does plastic take to break down?",
        options: ["Hundreds of years", "A few days", "One year"],
        answer: 0,
      },
      {
        q: "What small actions are suggested?",
        options: [
          "Bring our own bottle and separate rubbish",
          "Burn all the rubbish",
          "Buy more plastic things",
        ],
        answer: 0,
      },
      {
        q: "What is the writer's tone?",
        options: ["Concerned and hopeful", "Angry and hopeless", "Joking and careless"],
        answer: 0,
      },
    ],
  },
  {
    id: "r-volunteer",
    title: "A Volunteer Experience",
    level: "hard",
    text: "Last holiday, I joined a volunteer programme in my village. We cleaned the river and planted trees along the bank. At first, the work was hard and the sun was very hot. But when we saw the river become clean, we felt very proud. I learned that helping others does not always mean giving money. Sometimes, giving our time is even more valuable.",
    questions: [
      {
        q: "What did the volunteers do?",
        options: [
          "Cleaned the river and planted trees",
          "Built new houses",
          "Sold food in the market",
        ],
        answer: 0,
      },
      {
        q: "How did they feel after the work?",
        options: ["Proud", "Angry", "Bored"],
        answer: 0,
      },
      {
        q: "What did the writer learn?",
        options: [
          "Giving our time can be more valuable than money",
          "Money is everything in life",
          "Volunteers always get paid",
        ],
        answer: 0,
      },
    ],
  },
];

/** Satu babak bacaan = satu bacaan + satu pertanyaan. */
export interface ReadingRound {
  passage: ReadingPassage;
  question: ReadingQuestion;
}

export function readingByLevel(level: ReadingLevel): ReadingPassage[] {
  const list = readingPassages.filter((p) => p.level === level);
  return list.length > 0 ? list : readingPassages;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Bangun satu babak: pilih bacaan acak, lalu satu pertanyaan dari bacaan itu.
 * `prev` dipakai agar bacaan yang sama tidak muncul dua kali berturut-turut.
 */
export function buildReadingRound(
  pool: ReadingPassage[],
  prev?: ReadingRound | null,
): ReadingRound {
  const source = pool.length > 0 ? pool : readingPassages;
  let passage = pick(source);
  let guard = 0;
  while (prev && passage.id === prev.passage.id && source.length > 1 && guard < 8) {
    passage = pick(source);
    guard++;
  }
  const question = pick(passage.questions);
  return { passage, question };
}
