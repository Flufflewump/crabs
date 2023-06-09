var msgLog;
var resourceList;
var tabList;
var statusMsg;

/*
 * 
 * OBJECT DEFINITIONS
 * 
 */

var game = {
		tabs: new Map<string, GameTab>(), resources: new Map<string, Resource>(), 
		milestones: new Map<string, Milestone>(), buildings: new Map<string, Building>(), 
		globals: {
			oceanDrained : false,
			bucket : false,
			fancySandcastle : false,
			mould: false,

			mouldTicks: 0,

			crabitalist: false,
			crabitalistState: 0,
			
			debug: false

		}, activeTab: null
	};

class GameTab {
	name: string;
	visibleTest: Function;
	tabNode: HTMLElement;
	elements: TabElement[];
	paneNode: HTMLElement;

	constructor(name: string, visibleTest) {
		this.name = name;
		this.visibleTest = visibleTest;
		this.elements = [];
	}

	public toString = () : string => {
		return this.name;
	}

	public addElement(element: TabElement) {
		this.elements.push(element);
	}
}

interface TabElement {
	visibleTest: Function;
	node: HTMLElement;
}

class TabDiv implements TabElement {
	contents: string;
	visibleTest: Function;
	node: HTMLElement;

	constructor(contents: string, visibleTest: Function) {
		this.visibleTest = visibleTest;
		this.contents = contents;
	}
}

class TabImage implements TabElement {
	src: string;
	visibleTest: Function;
	node: HTMLElement;

	constructor(src: string, visibleTest: Function) {
		this.visibleTest = visibleTest;
		this.src = src;
	}
}

class ButtonList implements TabElement{
	contents: Array<Button>;
	visibleTest: Function;
	node: HTMLElement;

	constructor(contents: Array<Button>, visibleTest: Function) {
		this.visibleTest = visibleTest;
		this.contents = contents;
	}
}

class Resource {
	name: string;
	singularName: string;
	amount: number;
	displayNode: HTMLElement;
	amountNode: HTMLElement;
	visibleTest: Function;

	constructor(name: string, singularName: string, visibleTest: Function) {
		this.name = name;
		this.singularName = singularName;
		this.amount = 0;
		console.log(visibleTest);
		this.visibleTest = visibleTest;
	}

	public toString = () : string => {
		return this.name;
	}
}

class Button {
	id: string;
	text: string;
	func: string;
	node: HTMLElement;
	visibleTest: Function;
	enableTest: Function;
	price: Price;

	constructor(id: string, text: string, func: string, visibleTest: Function = () => true, enableTest: Function = () => { return true; }, price : Price = null) {
		this.id = id;
		this.text = text;
		this.price = price;
		this.func = func;
		this.visibleTest = visibleTest;
		this.enableTest = enableTest;
	}
}

class Milestone {
	test: Function;
	event: Function;
	active: boolean;

	constructor(test, event) {
		this.test = test;
		this.event = event;
		this.active = true;
	}
}

// May not really be a building, I just needed a name for "thing that ticks every tick"
class Building {
	name: string;
	singularName: string;
	update: Function;
	amount: number;

	constructor(name: string, singularName: string, update: Function) {
		this.name = name;
		this.singularName = singularName;
		this.update = update;
		this.amount = 0;
	}
}

class ResourceCost {
	resource: Resource;
	initial: number;
	increment: Function;
	constructor(resource: Resource, initial: number, increment: Function) {
		this.resource = resource;
		this.initial = initial;
		this.increment = increment;
	}

	calculate(iterations: number) {
		var tempPrice = this.initial;
		for (var i = 0; i < iterations; i++) {
			tempPrice = this.increment(tempPrice);
		}

		return Math.floor(tempPrice);
	}
}

class Price {
	costs: Array<ResourceCost>;
	iterations: Function;
	displayNode: HTMLElement;

	constructor(costs: Array<ResourceCost>, iterations: Function = () => {return 0}) {
		this.costs = costs;
		this.iterations = iterations;
	}
	
	toString() : string {
		let outString = '';

		for (var cost of this.costs) {
			let curCost = cost.calculate(this.iterations());
			outString += curCost + ' ' + (curCost == 1 ? cost.resource.singularName : cost.resource.name) + ', ';
		}

		outString = outString.slice(0, -2);
		return outString;
	}

	canAfford() : boolean {
		for (const curCost of this.costs) {
			if (curCost.resource.amount < curCost.calculate(this.iterations())) {
				return false;
			}
		}

		return true;
	}

	spend() : boolean {
		if (this.canAfford()) {
			for (const curCost of this.costs) {
				addResource(curCost.resource, -curCost.calculate(this.iterations()));
			}
			return true;
		} else {
			return false;
		}
		
	}

	updateNode() {
		if ( this.displayNode != null) {
			this.displayNode.textContent = this.toString();
		}
	}
}

/*******************************************
 *                                         *
 *                GAME DATA                *
 * 		all of the "stuff" goes here       *
 *                                         *
 *******************************************/

// Create all the resources
game.resources.set('sand', new Resource('Sand', 'Sand', () => true));
game.resources.set('rocks', new Resource('Rocks', 'Rock', () => true));
game.resources.set('wet', new Resource('Wet', 'Wet', () => {return game.resources.get('wet').amount >= 1}));
game.resources.set('sandcastles', new Resource('Sandcastles', 'Sandcastle', () => {return game.milestones.get('sandcastleUnlock').active == false;}));
game.resources.set('crabs', new Resource('Crabs', 'Crab', () => {return game.globals.fancySandcastle}));

// Prices
let prices = {
	sandcastle: new Price([
		new ResourceCost(game.resources.get('sand'), 10, constantPrice)], 
			() => game.resources.get('sandcastles').amount),
	fancySandcastle: new Price(
		[new ResourceCost(game.resources.get('sand'), 20, constantPrice),
		new ResourceCost(game.resources.get('rocks'), 2, constantPrice),
		new ResourceCost(game.resources.get('sandcastles'), 4, constantPrice)]),

	bucket: new Price([new ResourceCost(game.resources.get('sandcastles'), 5, constantPrice)]),
	rockTrade: new Price([new ResourceCost(game.resources.get('sandcastles'), 3, constantPrice)]),
	rockTrade10: new Price([new ResourceCost(game.resources.get('sandcastles'), 30, constantPrice)]),
	mould: new Price([new ResourceCost(game.resources.get('rocks'), 20, constantPrice)]),

	room: new Price([
		new ResourceCost(game.resources.get('sand'), 100, (input:number) => input**1.05),
		new ResourceCost(game.resources.get('sandcastles'), 3, (input:number) => input**1.05)
	], () => game.resources.get('crabs').amount - 1)
}

// Cost increment functions
function constantPrice(input) {
	return input;
}

// Buildings
game.buildings.set('crabs', new Building('Crabs', 'Crab', crabTick))



/*******************
 *      TABS       *
 * *****************/

let beachTab = new GameTab('Beach', () => true);
game.tabs.set('beach', beachTab);

beachTab.addElement(new TabDiv('Sand and rocks line the beach.', () => true));
beachTab.addElement(new ButtonList([
	new Button('gather-sand', 'Gather sand', 'gatherButton()'),
	new Button('cheat', 'Cheat!', 'cheat()', () => {return game.globals.debug}),
	new Button('build-sandcastle', 'Build sandcastle', 'makeSandcastle()', () => {return (!game.milestones.get('sandcastleUnlock').active)}, () => prices.sandcastle.canAfford(), prices.sandcastle),
	new Button('build-fancy-castle', 'Build fancy sandcastle', 'makeFancySandcastle()', () => {return (game.globals.bucket && !game.globals.fancySandcastle)}, () => prices.fancySandcastle.canAfford(), prices.fancySandcastle)
], () => true));
beachTab.addElement(new TabDiv('<h3>Fancy Sandcastle</h3>', () => game.globals.fancySandcastle))
beachTab.addElement(new ButtonList([
	new Button('add-room', 'Add room', 'addRoom()', () => true, () => prices.room.canAfford(), prices.room)
], () => game.globals.fancySandcastle))


let oceanTab = new GameTab('Ocean', () => true);
game.tabs.set('ocean', oceanTab);

oceanTab.addElement(new TabDiv('The ocean is blue.', () => !game.globals.oceanDrained));
oceanTab.addElement(new TabDiv('The ocean is blue and dry.', () => game.globals.oceanDrained));
oceanTab.addElement(new ButtonList([
	new Button('gather-wet', 'Gather wet', 'gatherWet()', () => !game.globals.oceanDrained)
], () => true));


let crabitalistTab = new GameTab('Crabitalist', () => game.globals.crabitalist);
game.tabs.set('crabitalist', crabitalistTab);
crabitalistTab.addElement(new TabImage('images/crabitalist.png', () => true));
crabitalistTab.addElement(new TabDiv('The crabitalist wishes to buy and sell your goods.', () => game.globals.crabitalistState == 0));
crabitalistTab.addElement(new TabDiv('"I have many new things for sale!"', () => game.globals.crabitalistState == 1));
crabitalistTab.addElement(new ButtonList([
	new Button('buy-bucket', 'Buy bucket', 'buyBucket()', () => !game.globals.bucket, () => prices.bucket.canAfford(), prices.bucket),
	new Button('buy-rock', '5 Cool rocks', 'rockTrade()', () => game.globals.crabitalistState == 1, () => prices.rockTrade.canAfford(), prices.rockTrade),
	new Button('buy-50-rocks', '50 Cool rocks', 'rockTrade(10)', () => game.globals.crabitalistState == 1, () => prices.rockTrade10.canAfford(), prices.rockTrade10),
	new Button('buy-mould', 'Sandcastle Mould', 'buyMould()', () => (game.globals.crabitalistState == 1 && !game.globals.mould), () => prices.mould.canAfford(), prices.mould)
], () => true));


// Milestones
game.milestones.set('sandcastleUnlock', new Milestone(
	function () { return (game.resources.get('sand').amount >= 10); },
	function () {
		log('You have a little pile of sand. You could make a sandcastle out of it');
		this.active = false;
	})
);

game.milestones.set('tooMuchWet', new Milestone(
	function () { return (game.resources.get('wet').amount >= 99); },
	function () {
		log('Ocean ran out');
		game.globals.oceanDrained = true;
		this.active = false;
	})
);

game.milestones.set('unlockCrabitalist', new Milestone(
	function () { return (game.resources.get('sandcastles').amount >= 3); },
	function () {
		log('Your sandcastles have attracted the attention of a wealthy crabitalist');
		game.globals.crabitalist = true;
		this.active = false;
	})
);

game.milestones.set('firstRoom', new Milestone(
	function () { return (game.resources.get('crabs').amount >= 2); },
	function () {
		log('Another crab moves into the new room');
		this.active = false;
	})
);

game.milestones.set('crabitalistReturns', new Milestone(
	function () { return (game.resources.get('crabs').amount >= 5); },
	function () {
		log('The Crabitalist has returned!');
		game.globals.crabitalist = true;
		game.globals.crabitalistState = 1;
		this.active = false;
	})
);

/*
 *
 *	       CONTENT LOADED
 * 
 */

let gameLoop;

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('no-js').classList.add('hidden');
	msgLog = document.getElementById('log');
	resourceList = document.getElementById('resources');
	tabList = document.getElementById('tabs');
	statusMsg = document.getElementById('status');


	// ENABLE DEBUG MODE
	document.addEventListener('keypress', (event) => {
		if (event.key == 'd') {
			game.globals.debug = !game.globals.debug;
			log('Debug mode ' + (game.globals.debug ? 'enabled' : 'disabled'));
		}
	});


	statusMsg.innerText = "You are a crab.";

	for (const [key, value] of game.resources) {
		createResourceDisplay(key);
	}

	for (const [key, value] of  game.tabs) {
		createTabDisplay(key);
    }

	loadGame();
	saveGame();

	gameLoop = setInterval(update, 100);
	updateUI();
	document.getElementById('load-screen').classList.add('hidden');

	log('Loaded game!');
	log('Debug mode is ' + (game.globals.debug ? 'enabled' : 'disabled'), true);
});

/********************************************
 *                                          *
 *                                          *
 *             BUTTON FUNCTIONS             *
 *                                          *
 *                                          *
 *******************************************/

function cheat() {
	addResourceName('sand', 1000);
	addResourceName('rocks', 100);
}

function gatherButton() {
	addResourceName('sand', 1);
	if (Math.random() < (1/15)) {
		addResourceName('rocks', 1);
		log('You found a cool rock in the sand')
	}
}

function makeSandcastle() {
	if (prices.sandcastle.spend()) {
		addResourceName('sandcastles', 1);
	}
}

function gatherWet() {
	addResourceName('wet', 1);
}

function buyBucket() {
	if (prices.bucket.spend()) {
		log('You have acquired a bucket');
		log('The Crabitalist has fled!');
		game.globals.bucket = true;
		game.globals.crabitalist = false;
	}
	saveGame();
}

function buyMould() {
	if (prices.mould.spend()) {
		log('"Thank you for your patronage!"');
		game.globals.mould = true;
	}
}

function rockTrade(times: number = 1) {
	for (var i = 0; i < times; i++) {
		if (prices.rockTrade.spend()) {
			addResourceName('rocks', 5);
		}
	}
}

function makeFancySandcastle() {
	if (prices.fancySandcastle.spend()) {
		log('A friendly crab moves into the fancy sandcastle and begins adding sand to your pile');
		game.globals.fancySandcastle = true;
		game.buildings.get('crabs').amount += 1;
		addResourceName('crabs', 1);


		// TODO: This should get disabled afterwords. Do that after overhauling how visibility is stored (again)
		// Globals work now. Woo. Now do it for buttons.
		// Done. yay. I'm leaving these comments for sentimental reasons.
	}
}

function addRoom() {
	if (prices.room.spend()) {
		game.buildings.get('crabs').amount += 1;
		addResourceName('crabs', 1);
	}
}

/********************************************
 *                                          *
 *                                          *
 *           BUILDING FUNCTIONS             *
 *                                          *
 *                                          *
 *******************************************/

function crabTick() {
	addResourceName('sand', game.buildings.get('crabs').amount);
	if (game.globals.mould) {
		game.globals.mouldTicks ++;
		if (game.globals.mouldTicks > 10) {
			game.globals.mouldTicks -= 10;
			makeSandcastle();
		}
	}
}

/**********************************
 *                                *
 *	          GAME LOOP           *
 *                                *
 **********************************/

 function update() {
	for (const [key, building] of game.buildings) {
		building.update();
	}
	checkMilestones();
	updateUI();
}

function updateUI() {
	// Show visible resources
	for (const [resourceKey, resourceValue] of game.resources) {
		if (resourceValue.visibleTest()) {
			resourceValue.displayNode.classList.remove('hidden');
			// Update displayed amount
			resourceValue.amountNode.innerText = resourceValue.amount.toString();
        } else {
			resourceValue.displayNode.classList.add('hidden');
		}
    }

	// Tabs
	for (const [tabKey, tabValue] of game.tabs) {
		if (tabValue.visibleTest()) {
			tabValue.tabNode.classList.remove('hidden');
			tabValue.paneNode.classList.remove('hidden');
        } else {
			tabValue.tabNode.classList.add('hidden');
			tabValue.paneNode.classList.add('hidden');
		}
		// Buttons
		for (var element of tabValue.elements) {
			if (element.visibleTest()) {
				element.node.classList.remove('hidden');
				
			} else {
				element.node.classList.add('hidden');
			}

			if (element instanceof ButtonList) {
				for(var button of element.contents)
				if (button.visibleTest()) {
					button.node.classList.remove('hidden');
					
					if (button.enableTest()) {
						button.node.classList.remove('disabled');
					} else {
						button.node.classList.add('disabled');
					}

				} else {
					button.node.classList.add('hidden');
				}

			}
		}

		// Prices
		for (const price in prices) {
			prices[price].updateNode();
		}
    }
	
	if (!game.tabs.get(game.activeTab).visibleTest()) {
		for (const [tabName, tab] of game.tabs) {
			if (tab.visibleTest()) {
				switchTab(tabName);
				break;
			}
		}
	}
}

function checkMilestones() {
	for (var [key, milestone] of game.milestones) {
		if (milestone.active && milestone.test()) {
			milestone.event();
			saveGame();
        }
    }
}

/*******************************************
 *                                         *
 *             ENGINE STUFF                *
 *                                         *
 *******************************************/

function addResourceName(resName: string, amount: number) {
	addResource(game.resources.get(resName), amount);
}

function addResource(res: Resource, amount: number) {
	res.amount += amount;

	checkMilestones();
	updateUI();
	saveGame();
}

function createResourceDisplay(resName) {
	var res = game.resources.get(resName);

	var newResource = document.createElement('li');
	newResource.classList.add('resource');
	newResource.setAttribute('id', resName);

	// This is where the amount of the resource will be displayed
	var newAmountNode = document.createElement('span');
	newAmountNode.classList.add('resource-number');
	newAmountNode.innerText = res.amount.toString();

	// Keep it in game.resources so it can be updated
	res.displayNode = newResource;
	res.amountNode = newAmountNode;

	//Put it all together
	newResource.innerText = res.name + ': ';
	newResource.appendChild(newAmountNode);

	resourceList.appendChild(newResource);
}

/*
 * 
 * HELPER FUNCTIONS: TABS
 * 
 */

function switchTab(tabName) {
	game.activeTab = tabName;

	var tab = game.tabs.get(tabName);

	for (const [tabName, tab] of game.tabs) {
		tab.tabNode.classList.remove('active');
		tab.paneNode.classList.remove('active');
	}
	tab.tabNode.classList.add('active');
	tab.paneNode.classList.add('active');

	saveGame();
}

function createTabDisplay(tabName) {
	var tab = game.tabs.get(tabName);

	// Tab at top of pane
	var newTab = document.createElement('span');
	newTab.classList.add('tab');
	newTab.setAttribute('onclick', 'switchTab(\'' + tabName + '\')');
	newTab.setAttribute('id', tabName);
	newTab.innerText = tab.name;

	// The pane itself
	var newTabPane = document.createElement('div');
	newTabPane.classList.add('pane');
	newTabPane.setAttribute('id', tabName);

	// Add html elements
	for (const element of tab.elements) {
		var newElement = document.createElement('div');

		if (element instanceof TabDiv) {
			newElement.innerHTML = element.contents;
		} 
		else if (element instanceof TabImage) {
			var imageElement = document.createElement('img');
			imageElement.setAttribute('src', element.src);
			newElement.appendChild(imageElement);
		}
		else if (element instanceof ButtonList) {
			newElement.classList.add('button-list');

			// Build the list of buttons
			for (const button of element.contents) {
				var newButton = document.createElement('button');
				newButton.setAttribute('id', button.id);
				newButton.setAttribute('onclick', button.func);
				newButton.innerText = (button.text);

				if (button.price != null) {
					var priceDisplay = document.createElement('div');
					priceDisplay.classList.add('button-price');
					priceDisplay.textContent = button.price.toString();
					button.price.displayNode = priceDisplay;
					newButton.appendChild(priceDisplay);
				}

				button.node = newButton;
				newElement.appendChild(newButton);
			}
		}

		element.node = newElement;
		newTabPane.appendChild(newElement);
	}

	tab.tabNode = newTab;
	tab.paneNode = newTabPane;

	// Add them to the DOM
	tabList.appendChild(newTab);
	document.getElementById('panes').appendChild(newTabPane);

}

/*
 * 
 * LOGGING
 * 
 */

function log(msg, debug = false) {
	if (debug) {
		console.log(msg);
		if (!game.globals.debug) { return };
	}
	const newMsg = document.createElement('li');
	newMsg.classList.add('logmsg');
	newMsg.innerText = msg;

	msgLog.appendChild(newMsg);

	msgLog.scrollTop = msgLog.scrollHeight;
}

/*
 * 
 * SAVE
 * 
 */

function saveGame() {
	var saveData = {resources : {}, buildings : {}, milestones: {}, globals: {}, activeTab: null}
	for (const [key, value] of game.resources) {
		saveData.resources[key] = value.amount;
	}
	for (const [key, value] of game.buildings) {
		saveData.buildings[key] = value.amount;
	}
	for (const [key, value] of game.milestones) {
		saveData.milestones[key] =  value.active;
    }

	for (const global in game.globals) {
		saveData.globals[global] = game.globals[global];
	}

	saveData.activeTab = game.activeTab;

	localStorage.setItem('game', JSON.stringify(saveData));
}

/*
 * 
 * LOAD
 * 
 */

function loadGame() {
	const gameStr = localStorage.getItem('game');

	if (gameStr !== null) {
		var saveData = JSON.parse(gameStr);

		/*
		 * Set up all the stuff from the save
		 */

		// Resources
		for (const res in saveData.resources) {
			game.resources.get(res).amount = saveData.resources[res];
		}

		for (const building in saveData.buildings) {
			game.buildings.get(building).amount = saveData.buildings[building];
		}

		// Globals
		for (const global in saveData.globals) {
			game.globals[global] = saveData.globals[global]; 
		}

		// Milestones
		for (const milestone in saveData.milestones) {
			var curMilestone = game.milestones.get(milestone);
			curMilestone.active = saveData.milestones[milestone];
		}
		
		switchTab(saveData.activeTab);

		updateUI();

	} else {
		// No savegame, start from the beginning

		switchTab('beach');
	}
}

function debugReset() {
	clearInterval(gameLoop);
	localStorage.removeItem('game');
	location.reload();
}