import * as fs from "fs";
import * as path from "path";
import * as acorn from "acorn";
import * as escodegen from "escodegen";
import type { TkoolmvPlugin } from "../typings/tkoolmvPlugin";

const TARGET_OBJECT_NAMES = [
	"DataManager",
	"Bitmap",
	"CacheEntry",
	"Graphics",
	"ImageCache",
	"Input",
	"JsonEx",
	"Rectangle",
	"RequestQueue",
	"ScreenSprite",
	"Sprite",
	"Stage",
	"Tilemap",
	"TilingSprite",
	"ToneFilter",
	"ToneSprite",
	"TouchInput",
	"Utils",
	"Weather",
	"Window",
	"WindowLayer",
	"ImageManager",
	"PluginManager",
	"SceneManager",
	"SoundManager",
	"StorageManager",
	"TextManager",
	"AudioManager",
	"BattleManager",
	"ConfigManager",
	"Game_Action",
	"Game_ActionResult",
	"Game_Actor",
	"Game_Actors",
	"Game_Battler",
	"Game_BattlerBase",
	"Game_Character",
	"Game_CharacterBase",
	"Game_CommonEvent",
	"Game_Enemy",
	"Game_Event",
	"Game_Follower",
	"Game_Followers",
	"Game_Interpreter",
	"Game_Item",
	"Game_Map",
	"Game_Message",
	"Game_Party",
	"Game_Picture",
	"Game_Player",
	"Game_Screen",
	"Game_SelfSwitches",
	"Game_Switches",
	"Game_System",
	"Game_Temp",
	"Game_Timer",
	"Game_Troop",
	"Game_Unit",
	"Game_Variables",
	"Game_Vehicle",
	"Scene_Base",
	"Scene_Battle",
	"Scene_Boot",
	"Scene_Equip",
	"Scene_GameEnd",
	"Scene_Gameover",
	"Scene_Item",
	"Scene_ItemBase",
	"Scene_Map",
	"Scene_Menu",
	"Scene_MenuBase",
	"Scene_Options",
	"Scene_Shop",
	"Scene_Skill",
	"Scene_Status",
	"Scene_Title",
	"Scene_File",
	"Scene_Load",
	"Scene_Save",
	"Sprite_Actor",
	"Sprite_Animation",
	"Sprite_Balloon",
	"Sprite_Base",
	"Sprite_Battler",
	"Sprite_Character",
	"Sprite_Damage",
	"Sprite_Destination",
	"Sprite_Enemy",
	"Sprite_Picture",
	"Sprite_StateIcon",
	"Sprite_StateOverlay",
	"Sprite_Timer",
	"Sprite_Weapon",
	"Spriteset_Base",
	"Spriteset_Battle",
	"Spriteset_Map",
	"Window_ActorCommand",
	"Window_Base",
	"Window_BattleActor",
	"Window_BattleEnemy",
	"Window_BattleItem",
	"Window_BattleLog",
	"Window_BattleSkill",
	"Window_ChoiceList",
	"Window_Command",
	"Window_EquipCommand",
	"Window_EquipItem",
	"Window_EquipSlot",
	"Window_EquipStatus",
	"Window_EventItem",
	"Window_GameEnd",
	"Window_Gold",
	"Window_Help",
	"Window_HorzCommand",
	"Window_ItemCategory",
	"Window_ItemList",
	"Window_MapName",
	"Window_MenuActor",
	"Window_MenuCommand",
	"Window_MenuStatus",
	"Window_Message",
	"Window_NumberInput",
	"Window_Options",
	"Window_PartyCommand",
	"Window_ScrollText",
	"Window_Selectable",
	"Window_ShopBuy",
	"Window_ShopCommand",
	"Window_ShopNumber",
	"Window_ShopSell",
	"Window_ShopStatus",
	"Window_SkillList",
	"Window_SkillStatus",
	"Window_SkillType",
	"Window_Status",
	"Window_TitleCommand",
	"Window_SavefileList"
];

const TARGET_VARIABLE_NAMES = [
	"$gameVariables",
	"$gameSystem",
	"$gameSwitches",
	"$gameMessage",
	"$gamePlayer",
	"$dataCommonEvents",
	"$dataTilesets",
	"$gameMap",
	"$gameTemp",
	"$dataEnemies",
	"$gameActors",
	"$dataAnimations",
	"$gameParty",
	"$gameTroop",
	"$gameTimer",
	"$gameSelfSwitches",
	"$dataClasses",
	"$dataWeapons",
	"$dataArmors",
	"$dataItems",
	"$gameScreen",
	"$dataTroops",
	"$dataActors",
	"$dataSkills",
	"$dataStates",
	"$dataSystem",
	"$dataMapInfos",
	"$dataMap"
];

export function convertPlugins(targetPlugins: TkoolmvPlugin[], srcDir: string, distDir: string): void {
	targetPlugins.forEach(p => {
		if (!fs.existsSync(path.join(distDir, `${p.name}.js`))) {
			const pluginSrc = fs.readFileSync(path.join(srcDir, `${p.name}.js`)).toString();
			const modifiedSrc = modifyPluginsJs(pluginSrc);
			fs.writeFileSync(path.join(distDir, `${p.name}.js`), modifiedSrc);
		}
	});
}

export function modifyPluginsJs(src: string): string {
	const ast = acorn.parse(src, { ecmaVersion: 6 });
	let modifiedJsonString = JSON.stringify(ast);
	TARGET_OBJECT_NAMES.forEach(name => {
		modifiedJsonString = modifiedJsonString.replace(new RegExp(`"${name}"`, "g"), `"tkool_1.${name}"`);
	});
	TARGET_VARIABLE_NAMES.forEach(name => {
		modifiedJsonString = modifiedJsonString.replace(new RegExp(`"\\${name}"`, "g"), `"DataManager_1.${name}"`);
	});
	const modifiedAst = JSON.parse(modifiedJsonString);
	let modifiedSrc = escodegen.generate(modifiedAst);
	// キットで定義したクラスに直接代入はできないため、Object.assign()に書き換え
	modifiedSrc = modifiedSrc.replace(new RegExp("(tkool_1.[0-9a-zA-Z_$]+) *= *([0-9a-zA-Z_$.]+);?", "g"), "Object.assign($1, $2);");
	return `Object.defineProperty(exports, "__esModule", { value: true });
var tkool_1 = require("../");
var DataManager_1 = require("../managers/DataManager");
Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};

Number.prototype.mod = function(n) {
	return ((this % n) + n) % n;
};

String.prototype.format = function() {
	var args = arguments;
	return this.replace(/%([0-9]+)/g, function(s, n) {
		return args[Number(n) - 1];
	});
};

String.prototype.padZero = function(length){
	var s = this;
	while (s.length < length) {
		s = '0' + s;
	}
	return s;
};

Number.prototype.padZero = function(length){
	return String(this).padZero(length);
};

Array.prototype.equals = function() {
	if (!array || this.length !== array.length) {
		return false;
	}
	for (var i = 0; i < this.length; i++) {
		if (this[i] instanceof Array && array[i] instanceof Array) {
			if (!this[i].equals(array[i])) {
				return false;
			}
		} else if (this[i] !== array[i]) {
			return false;
		}
	}
	return true;
};

Array.prototype.clone = function() {
	return this.slice(0);
};

Array.prototype.contains = function(element) {
	return this.indexOf(element) >= 0;
};

String.prototype.contains = function(string) {
	return this.indexOf(string) >= 0;
};

Math.randomInt = function(max) {
	return Math.floor(max * Math.random());
};
${modifiedSrc}
`;
}
