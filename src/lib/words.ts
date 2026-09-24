/**
 * Bank kata untuk game klasifikasi (Noun / Verb / Adjective)
 * dan game mengetik dari gambar (Animals).
 */

export const rawNouns =
  "table,chair,computer,house,car,school,book,pen,pencil,bag,student,teacher,doctor,driver,apple,banana,orange,cat,dog,elephant,lion,tiger,fish,bird,flower,tree,sun,moon,star,sky,water,fire,earth,wind,door,window,floor,wall,clock,phone,money,paper,shirt,shoe,hat,ball,game,music,movie,city,village,road,bus,train,plane,ship,beach,mountain,river,lake,head,hand,foot,eye,nose,mouth,hair,heart,friend,family,baby,king,queen,key,box,cup,plate,spoon,fork,knife,bottle,bread,rice,meat,egg,milk,coffee,tea,sugar,salt,sand,rock,gold,silver,iron,wood,glass,plastic,rain,snow,cloud,storm,summer,winter,night,day,week,month,year";

export const rawVerbs =
  "run,eat,sleep,drink,go,come,sit,stand,walk,jump,fly,swim,write,read,speak,listen,sing,dance,play,study,teach,learn,work,cook,clean,wash,buy,sell,open,close,push,pull,cut,draw,paint,build,break,fix,drive,ride,climb,fall,throw,catch,hit,kick,punch,kiss,hug,laugh,cry,smile,shout,whisper,think,know,understand,forget,remember,love,hate,like,want,need,have,get,give,take,make,do,see,watch,look,hear,smell,touch,taste,feel,believe,hope,pray,fight,win,lose";

export const rawAdjectives =
  "happy,sad,angry,excited,bored,tired,hungry,thirsty,scared,brave,shy,proud,lucky,crazy,stupid,smart,clever,wise,funny,serious,good,bad,evil,kind,cruel,honest,polite,rude,lazy,diligent,strong,weak,fast,slow,big,small,huge,tiny,tall,short,long,wide,narrow,thick,thin,fat,skinny,old,young,new,rich,poor,cheap,expensive,beautiful,ugly,handsome,cute,pretty,clean,dirty,messy,neat,dry,wet,hot,cold,warm,cool,bright,dark,soft,hard,rough,smooth,sharp,blunt,heavy,light,full,empty,noisy,quiet,loud,silent,sweet,sour,bitter,salty,spicy,delicious";

const split = (raw: string) =>
  raw
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

export const nouns = split(rawNouns);
export const verbs = split(rawVerbs);
export const adjectives = split(rawAdjectives);

/** 100 kata hewan dari data_input.xlsx */
export const animalWords =
  "Cat,Dog,Chicken,Duck,Cow,Goat,Sheep,Horse,Pig,Rabbit,Hamster,Buffalo,Goose,Turkey,Donkey,Lion,Tiger,Elephant,Giraffe,Zebra,Monkey,Gorilla,Bear,Wolf,Fox,Deer,Rhinoceros,Hippopotamus,Kangaroo,Koala,Panda,Camel,Squirrel,Bat,Hedgehog/Porcupine,Mouse/Rat,Raccoon,Beaver,Sloth,Leopard,Cheetah,Hyena,Civet,Bird,Eagle,Owl,Parrot,Pigeon,Crow,Sparrow,Peacock,Ostrich,Penguin,Flamingo,Swan,Hawk,Woodpecker,Seagull,Snake,Lizard,Gecko,House Lizard,Crocodile,Tortoise,Sea Turtle,Frog,Toad,Chameleon,Iguana,Komodo Dragon,Fish,Shark,Whale,Dolphin,Octopus,Squid,Shrimp,Crab,Lobster,Jellyfish,Starfish,Seahorse,Eel,Seal,Clam/Shellfish,Stingray,Ant,Mosquito,Fly,Bee,Wasp,Butterfly,Moth,Dragonfly,Grasshopper,Cricket,Cockroach,Spider,Scorpion,Centipede"
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

/**
 * Bangun URL gambar AI (Pollinations) dari sebuah kata — sama seperti data.py.
 * Dipakai server-side agar tidak bergantung pada file Excel.
 */
export function imageUrlFor(word: string): string {
  const clean = word
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const prompt = encodeURIComponent(`${clean} realistic photo`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=640&height=480&nologo=true`;
}
