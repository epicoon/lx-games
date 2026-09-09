// @lx:namespace lxGames.ootv;
class Constants {
	// @lx:const FIELD_SIZE = 400;
	// @lx:const fisSMOOTH = 32;

	// @lx:const
	GAMERS = {
		yellow: {
			name: lx.i18n(gamer.raccoon),
			color: 'charYellow',
			chipColor: [1, 1, 0],
		},
		red: {
			name: lx.i18n(gamer.hamster),
			color: 'charRed',
			chipColor: [1, 0.3, 0.3],
		},
		green: {
			name: lx.i18n(gamer.beaver),
			color: 'charGreen',
			chipColor: [0, 1, 0],
		},
		blue: {
			name: lx.i18n(gamer.hadgehog),
			color: 'charBlue',
			chipColor: [0.5, 0.5, 1],
		},
	};

	// @lx:const
	GROUP_COLOR = {
		0: '#A66A3F', // GROUP_PROBE
		1: '#4F9A5B', // GROUP_STATION
		2: '#4285B5', // GROUP_SOLAR_PANEL
		3: '#8055B5', // GROUP_TECHNOLOGY
		4: '#D0A62C', // GROUP_DRONE
		5: '#B94A48', // GROUP_MODULE
	};

	// @lx:const
	CHIP_COLOR = {
		/*MINING_PROBE*/    brown:  'brownSide.png',
		/*COMMAND_STATION*/ green:  'greenSide.png',
		/*SOLAR_PANEL*/     blue:   'blueSide.png',
		/*TECHNOLOGY*/       violet: 'violetSide.png',
		/*DRONES*/          yellow: 'yellowSide.png',
		/*MODULES*/         red:    'redSide.png',
		black:       'commonSide',
		minerals:    'commonSide',
		bonusMax:    'commonSide',
		bonusMin:    'commonSide',
		credit:      'commonSide',
		dataStorage: 'commonSide',
		counter100:  'commonSide',
	};
	// @lx:const CHIP_BACK = 'chipBack.png';

	// @lx:const STATUS_NONE = 0;
	// @lx:const STATUS_PENDING = 1;
	// @lx:const STATUS_OVER = 2;
	// @lx:const STATUS_USE_DICE = 5;
	// @lx:const STATUS_USE_CREDIT = 6;
	// @lx:const STATUS_SPLIT = 7;
	// @lx:const STATUS_GET_MODULE = 8;
	// @lx:const STATUS_GET_PCK = 9;
	// @lx:const STATUS_GET_DP = 10;
	// @lx:const STATUS_GET_MINERAL = 11;
	// @lx:const STATUS_GET_SECOND_MINERAL = 12;
	// @lx:const STATUS_SET_CHIP = 13;
	// @lx:const STATUS_AI = 14;

	// @lx:const TILE_MINERALS_STAGE = 0;
	// @lx:const TILE_MINERALS_TURN = 1;
	// @lx:const TILE_MINERALS_INGAME = 2;
	// @lx:const TILE_MINERALS_INGAMER = 3;
	// @lx:const TILE_MINERALS_SOLD = 4;
	// @lx:const TILE_ADVANTAGE_DICE = 5;
	// @lx:const TILE_ADVANTAGE_FORSALE = 6;
	// @lx:const TILE_ADVANTAGE_WAITING = 7;
	// @lx:const TILE_ADVANTAGE_LOCATED = 8;
	// @lx:const TILE_CREDIT = 9;
	// @lx:const TILE_DATA_STORAGE = 10;
	// @lx:const TILE_DICE_GAME = 11;
	// @lx:const TILE_DICE_GAMER = 12;
	// @lx:const TILE_DICE_WAITING = 13;
	// @lx:const TILE_BONUS_INGAME = 14;
	// @lx:const TILE_BONUS_INGAMER = 15;
	// @lx:const TILE_GAMER_SEQUENCE = 16;
	// @lx:const TILE_GAMER_POINTS = 17;
	// @lx:const TILE_COUNTER = 18;

	// @lx:const SCORE_DRONE = 0;
	// @lx:const SCORE_MINERALS = 1;
	// @lx:const SCORE_TELESCOPE = 2;
	// @lx:const SCORE_FILL = 3;
	// @lx:const SCORE_FILLBONUS = 4;
	// @lx:const SCORE_DATA_STORAGE = 5;
	// @lx:const SCORE_CREDIT = 6;
	// @lx:const SCORE_LOSTMINERALS = 7;
	// @lx:const SCORE_BONUS = 8;
	// @lx:const SCORE_TECHNOLOGY = 9;

	// @lx:const GROUP_PROBE = 0;
	// @lx:const GROUP_STATION = 1;
	// @lx:const GROUP_SOLAR_PANEL = 2;
	// @lx:const GROUP_TECHNOLOGY = 3;
	// @lx:const GROUP_DRONE = 4;
	// @lx:const GROUP_MODULE = 5;
	// @lx:const GROUP_MINERALS = 6;
	// @lx:const GROUP_BONUS_MAX = 7;
	// @lx:const GROUP_BONUS_MIN = 8;
	// @lx:const GROUP_COUNTER = 9;
	// @lx:const GROUP_DATA_STORAGE = 10;
	// @lx:const GROUP_CREDIT = 11;
	// @lx:const GROUP_100 = 12;

	// @lx:const VARIANT_PROBE = 0;
	// @lx:const VARIANT_STATION = 1;
	// @lx:const VARIANT_SOLAR_PANEL = 2;

	// @lx:const VARIANT_TECHNOLOGY_1 = 3;
	// @lx:const VARIANT_TECHNOLOGY_2 = 4;
	// @lx:const VARIANT_TECHNOLOGY_3 = 5;
	// @lx:const VARIANT_TECHNOLOGY_4 = 6;
	// @lx:const VARIANT_TECHNOLOGY_5 = 7;
	// @lx:const VARIANT_TECHNOLOGY_6 = 8;
	// @lx:const VARIANT_TECHNOLOGY_7 = 9;
	// @lx:const VARIANT_TECHNOLOGY_8 = 10;
	// @lx:const VARIANT_TECHNOLOGY_9 = 11;
	// @lx:const VARIANT_TECHNOLOGY_10 = 12;
	// @lx:const VARIANT_TECHNOLOGY_11 = 13;
	// @lx:const VARIANT_TECHNOLOGY_12 = 14;
	// @lx:const VARIANT_TECHNOLOGY_13 = 15;
	// @lx:const VARIANT_TECHNOLOGY_14 = 16;
	// @lx:const VARIANT_TECHNOLOGY_15 = 17;
	// @lx:const VARIANT_TECHNOLOGY_16 = 18;
	// @lx:const VARIANT_TECHNOLOGY_17 = 19;
	// @lx:const VARIANT_TECHNOLOGY_18 = 20;
	// @lx:const VARIANT_TECHNOLOGY_19 = 21;
	// @lx:const VARIANT_TECHNOLOGY_20 = 22;
	// @lx:const VARIANT_TECHNOLOGY_21 = 23;
	// @lx:const VARIANT_TECHNOLOGY_22 = 24;
	// @lx:const VARIANT_TECHNOLOGY_23 = 25;
	// @lx:const VARIANT_TECHNOLOGY_24 = 26;
	// @lx:const VARIANT_TECHNOLOGY_25 = 27;
	// @lx:const VARIANT_TECHNOLOGY_26 = 28;

	// @lx:const VARIANT_DRONE_SERVICE2 = 29;
	// @lx:const VARIANT_DRONE_SERVICE3 = 30;
	// @lx:const VARIANT_DRONE_SERVICE4 = 31;
	// @lx:const VARIANT_DRONE_SCOUT2 = 32;
	// @lx:const VARIANT_DRONE_SCOUT3 = 33;
	// @lx:const VARIANT_DRONE_SCOUT4 = 34;
	// @lx:const VARIANT_DRONE_CARGO2 = 35;
	// @lx:const VARIANT_DRONE_CARGO3 = 36;
	// @lx:const VARIANT_DRONE_CARGO4 = 37;
	// @lx:const VARIANT_DRONE_SUPPORT2 = 38;
	// @lx:const VARIANT_DRONE_SUPPORT3 = 39;
	// @lx:const VARIANT_DRONE_SUPPORT4 = 40;

	// @lx:const VARIANT_MODULE_DRONE_PLANT = 41;
	// @lx:const VARIANT_MODULE_LAB = 42;
	// @lx:const VARIANT_MODULE_SUPERCOMPUTER = 43;
	// @lx:const VARIANT_MODULE_ASSEMBLY = 44;
	// @lx:const VARIANT_MODULE_TOKAMAK = 45;
	// @lx:const VARIANT_MODULE_ROBOPORT = 46;
	// @lx:const VARIANT_MODULE_SPLITTER = 47;
	// @lx:const VARIANT_MODULE_TELESCOPE = 48;

	// @lx:const VARIANT_BONUS_MAX_BROWN = 49;
	// @lx:const VARIANT_BONUS_MAX_GREEN = 50;
	// @lx:const VARIANT_BONUS_MAX_BLUE = 51;
	// @lx:const VARIANT_BONUS_MAX_VIOLET = 52;
	// @lx:const VARIANT_BONUS_MAX_YELLOW = 53;
	// @lx:const VARIANT_BONUS_MAX_RED = 54;

	// @lx:const VARIANT_BONUS_MIN_BROWN = 55;
	// @lx:const VARIANT_BONUS_MIN_GREEN = 56;
	// @lx:const VARIANT_BONUS_MIN_BLUE = 57;
	// @lx:const VARIANT_BONUS_MIN_VIOLET = 58;
	// @lx:const VARIANT_BONUS_MIN_YELLOW = 59;
	// @lx:const VARIANT_BONUS_MIN_RED = 60;

	// @lx:const VARIANT_DATA_STORAGE = 61;
	// @lx:const VARIANT_CREDIT = 62;

	// @lx:const VARIANT_COUNTER_100_YELLOW = 63;
	// @lx:const VARIANT_COUNTER_100_RED = 64;
	// @lx:const VARIANT_COUNTER_100_GREEN = 65;
	// @lx:const VARIANT_COUNTER_100_BLUE = 66;

	// @lx:const MINERALS_1 = 1;
	// @lx:const MINERALS_2 = 2;
	// @lx:const MINERALS_3 = 3;
	// @lx:const MINERALS_4 = 4;
	// @lx:const MINERALS_5 = 5;
	// @lx:const MINERALS_6 = 6;

	// @lx:const
	CHIP_IMG_NAMES = [
		'MINING_PROBE.png', 'COMMAND_STATION.png', 'SOLAR_PANEL.png',

		'knowledge1.png', 'knowledge2.png', 'knowledge3.png', 'knowledge4.png',
		'knowledge5.png', 'knowledge6.png', 'knowledge7.png', 'knowledge8.png',
		'knowledge9.png', 'knowledge10.png', 'knowledge11.png', 'knowledge12.png',
		'knowledge13.png', 'knowledge14.png', 'knowledge15.png', 'knowledge16.png',
		'knowledge17.png', 'knowledge18.png', 'knowledge19.png', 'knowledge20.png',
		'knowledge21.png', 'knowledge22.png', 'knowledge23.png', 'knowledge24.png',
		'knowledge25.png', 'knowledge26.png',

		'SERVICE_DRONE_2.png', 'SERVICE_DRONE_3.png', 'SERVICE_DRONE_4.png',
		'SCOUT_DRONE_2.png', 'SCOUT_DRONE_3.png', 'SCOUT_DRONE_4.png',
		'CARGO_DRONE_2.png', 'CARGO_DRONE_3.png', 'CARGO_DRONE_4.png',
		'SUPPORT_DRONE_2.png', 'SUPPORT_DRONE_3.png', 'SUPPORT_DRONE_4.png',

		'DRONE_MANUFACTURING_PLANT.png', 'RESEARCH_LABORATORY.png', 'SUPERCOMPUTER.png', 'ASSEMBLY_MODULE.png',
		'TOKAMAK.png', 'ROBOPORT.png', 'MATTER_SPLITTER.png', 'TELESCOPE.png',

		'brownMedal1', 'greenMedal1', 'blueMedal1', 'violetMedal1', 'yellowMedal1', 'redMedal1',
		'brownMedal2', 'greenMedal2', 'blueMedal2', 'violetMedal2', 'yellowMedal2', 'redMedal2',

		'dataStorage',
		'energyCredit',

		'100pointsYellow',
		'100pointsRed',
		'100pointsGreen',
		'100pointsBlue',
	];
}
