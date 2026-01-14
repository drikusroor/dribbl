const WORDS = [
  // --- Original List ---
  'watermelon', 'house', 'cat', 'tree', 'car', 'pizza', 'guitar',
  'mountain', 'bicycle', 'flower', 'rocket', 'elephant', 'beach', 'clock', 'rainbow',
  'phone', 'book', 'computer', 'sun', 'moon', 'star', 'cloud', 'fish', 'bird',

  // --- Animals (Distinct Shapes) ---
  'giraffe', 'snake', 'spider', 'butterfly', 'penguin', 'lion', 'shark', 'crab',
  'turtle', 'rabbit', 'duck', 'pig', 'cow', 'frog', 'bear', 'monkey', 'mouse',
  'bat', 'owl', 'bee', 'snail', 'dinosaur', 'dragon', 'unicorn', 'octopus',
  'dolphin', 'whale', 'camel', 'kangaroo', 'zebra', 'crocodile', 'flamingo',
  'hedgehog', 'squirrel', 'worm', 'ladybug', 'jellyfish', 'horse', 'chicken',

  // --- Food & Drink ---
  'burger', 'ice cream', 'banana', 'egg', 'cheese', 'sushi', 'pancake', 'grapes',
  'donut', 'apple', 'orange', 'strawberry', 'cherry', 'pineapple', 'corn', 'carrot',
  'mushroom', 'bread', 'sandwich', 'cookie', 'cake', 'chocolate', 'candy', 'lollipop',
  'popcorn', 'fries', 'hotdog', 'taco', 'lemon', 'pear', 'bacon', 'cupcake',
  'milk', 'coffee', 'tea', 'juice', 'soda', 'coconut', 'avocado', 'potato',

  // --- Household & Objects ---
  'chair', 'lamp', 'bed', 'toothbrush', 'toilet', 'broom', 'key', 'door', 'window',
  'table', 'sofa', 'television', 'radio', 'candle', 'box', 'backpack', 'suitcase',
  'umbrella', 'balloon', 'kite', 'doll', 'teddy bear', 'mirror', 'comb', 'ladder',
  'pillow', 'blanket', 'vase', 'basket', 'soap', 'sponge', 'fan', 'fridge',
  'oven', 'microwave', 'toaster', 'blender', 'washing machine', 'bucket', 'mop',
  'shovel', 'hammer', 'saw', 'screwdriver', 'scissors', 'pencil', 'pen', 'marker',
  'eraser', 'paper', 'envelope', 'stamp',

  // --- Clothes & Accessories ---
  'hat', 'glasses', 'shoe', 'sock', 'shirt', 'pants', 'dress', 'skirt', 'coat',
  'jacket', 'scarf', 'gloves', 'boots', 'belt', 'tie', 'bowtie', 'necklace', 'ring',
  'watch', 'crown', 'mask', 'helmet', 'zipper', 'button', 'pocket', 'sandals',
  'swimsuit', 'purse', 'wallet', 'umbrella',

  // --- Nature & Weather ---
  'volcano', 'ocean', 'rain', 'snowman', 'lightning', 'tornado', 'cave', 'river',
  'lake', 'forest', 'desert', 'island', 'city', 'park', 'fire', 'smoke', 'wind',
  'planet', 'comet', 'asteroid', 'snowflake', 'leaf', 'grass', 'rose', 'cactus',
  'palm tree', 'bush', 'waterfall', 'mountain', 'hill', 'field',

  // --- Technology & Electronics ---
  'robot', 'camera', 'headphones', 'battery', 'calculator', 'keyboard', 'mouse',
  'screen', 'laptop', 'tablet', 'joystick', 'gamepad', 'printer', 'speaker',
  'microphone', 'lightbulb', 'plug', 'wire', 'satellite', 'telescope', 'microscope',

  // --- Transport & Vehicles ---
  'bus', 'train', 'airplane', 'boat', 'submarine', 'helicopter', 'skateboard',
  'roller skates', 'scooter', 'motorcycle', 'truck', 'van', 'taxi', 'ambulance',
  'police car', 'firetruck', 'tractor', 'crane', 'spaceship', 'canoe', 'sail',
  'anchor', 'wheel', 'tire',

  // --- Body Parts ---
  'eye', 'hand', 'foot', 'nose', 'ear', 'lips', 'mouth', 'tooth', 'tongue',
  'finger', 'thumb', 'arm', 'leg', 'knee', 'hair', 'beard', 'moustache', 'bone',
  'skull', 'skeleton', 'heart', 'brain', 'stomach', 'footprint', 'fingerprint',

  // --- Characters & People ---
  'ghost', 'zombie', 'pirate', 'ninja', 'alien', 'king', 'queen', 'witch', 'wizard',
  'vampire', 'clown', 'doctor', 'nurse', 'policeman', 'fireman', 'chef', 'artist',
  'baby', 'soldier', 'superhero', 'angel', 'devil', 'mummy', 'elf', 'fairy',

  // --- Sports & Hobbies ---
  'soccer ball', 'basketball', 'football', 'baseball', 'tennis racket', 'golf club',
  'bat', 'goal', 'trophy', 'medal', 'whistle', 'fishing rod', 'paintbrush', 'palette',
  'chess piece', 'dice', 'cards', 'piano', 'drum', 'violin', 'trumpet', 'flute'
];

export default WORDS;