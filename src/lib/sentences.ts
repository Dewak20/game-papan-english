/** Bank kalimat untuk game Sentence Battle (susun kata). */

export const defaultSentences =
  "I am happy|She runs fast|Birds can fly|I love you|Sun is hot|Dogs can bark|Cats like milk|We play ball|Open the door|Close the book|Stand up please|Sit down now|He is tall|She is smart|I am sad|It is cold|Fire is hot|Fish can swim|Look at me|Listen to me|Read a book|Write your name|I drink water|She eats bread|They run away|We are here|Who are you|What is that|This is fun|My mom cooks|My dad works|Sky is blue|Grass is green|Snow is white|Blood is red|I have money|She has time|We go home|Come with me|Go away now|Be careful please|Don't do that|Stop right there|Help me please|Call the police|I am tired|She is sick|He is angry|They are late|We are early|Time is up|Game is over|My name is Budi|I live in Jakarta|How are you today|She plays the piano|He goes to school|We study English together|They play football everyday|The cat sleeps on sofa|My mother cooks fried rice|My father reads a newspaper|I brush my teeth twice|She washes her hands|He cleans his bedroom|We watch movies on Sunday|They listen to music|I want to become a doctor|She wants to be a teacher|Do you like ice cream|Yes I like it very much|Where do you come from|I come from Bali Indonesia|What time is it now|It is seven o clock|Please turn off the light|Please open the window|Can you help me please|Thank you very much|You are welcome my friend|Have a nice day|Good morning mister teacher|See you tomorrow my friend|The elephant is very big|The ant is very small|The cheetah runs very fast|The turtle walks very slow|I like blue and red|She likes pink and purple|My favorite food is noodle|His favorite drink is milk|We are playing video games|They are doing their homework|I went to the beach|She bought a new bag|He drove a red car|We ate pizza last night|They saw a movie yesterday|Did you sleep well|I did not sleep well|Where did you go|I stayed at home|The quick brown fox jumps over the lazy dog|I went to the zoo with my family yesterday|She is reading a very interesting book in the library|We are going to visit our grandmother next week|They were playing football when it started to rain|My father is working in a big office in Jakarta|My mother is cooking delicious food in the kitchen|Please turn off the lights before you leave the room|Can you tell me the way to the nearest hospital|I have been waiting for you for two hours|She has already finished her homework before dinner|We should respect our parents and our teachers|Education is the most powerful weapon to change the world|Honesty is the best policy in every situation|Practice makes perfect if you do it everyday|The sun rises in the east and sets in the west|There are seven days in a week and twelve months in a year|My favorite color is blue because it reminds me of the sky|I want to travel around the world when I grow up|She is the most beautiful girl I have ever seen|He is the smartest student in the whole class|We must study hard to achieve our dreams in the future|Do not throw rubbish anywhere keep our environment clean|Always wash your hands before eating to stay healthy|Drinking water is good for your health and body|Vegetables and fruits are very important for our diet|The internet helps us to find information very quickly|Smartphone is a very useful device for communication|Reading books can increase our knowledge about the world|Learning English is important for international communication";

export type Difficulty = "easy" | "medium" | "hard";

export function sentencesByDifficulty(raw: string, diff: Difficulty): string[] {
  const all = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  let filtered: string[] = [];
  if (diff === "easy") {
    filtered = all.filter((s) => s.split(" ").length <= 4);
  } else if (diff === "medium") {
    filtered = all.filter((s) => {
      const l = s.split(" ").length;
      return l >= 5 && l <= 7;
    });
  } else {
    filtered = all.filter((s) => s.split(" ").length >= 8);
  }

  return filtered.length > 0 ? filtered : all;
}
