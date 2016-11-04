 //By Carlos LeÃ³n, 2016
 //Licensed under Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)

'use strict';

//////////////////////////////////////////////////////////////////////////////

// Entity type to differentiate entities and have them attack those not
// belonging to the same kind
var EntityType = {
    GOOD: 0,
    EVIL: 1
};

// Entity constructor
// 
// Entities have a name (it doesn't have to be unique, but it helps) and a type
//
// Additionally, entities accept a list of instantiated components
function Entity(entityName, entityType, components) {
    var self = this;
    this.entityName = entityName;

    // Instead of assigning the parameter, we call `addComponent`, which is a
    // bit smarter than default assignment
    this.components = [];
    components.forEach(function(component) {
        self.addComponent(component);
    });
    this.type = entityType;
}

Entity.prototype.addComponent = function(component) {
    this.components.push(component);
    component.entity = this;
};

// This function delegates the tick on the components, gathering their messages
// and aggregating them into a single list of messages to be delivered by the
// message manager (the game itself in this case
Entity.prototype.tick = function() {
    var outcoming = [];
    this.components.forEach(function(component) {
        var messages = component.tick();
        messages.forEach(function (message) {
            outcoming.push(message);
        });
    });
    return outcoming;
};

// All received messages are forwarded to the components
Entity.prototype.receive = function(message) {
    // If the receiver is `null`, this is a broadcast message that must be
    // accepted by all entities
    if(!message.receiver || message.receiver === this) {
        this.components.forEach(function(component) {
            component.receive(message);
        });
    }
};
//////////////////////////////////////////////////////////////////////////////
// if the receiver is null, it is a broadcast message
function Message(receiver) {
    this.receiver = receiver;
}

//////////////////////////////////////////////////////////////////////////////
function Component(entity) {
    this.entity = entity;
    this.messageQueue = [];
}

Component.prototype.tick = function() {
    // We return a copy of the `messageQueue`, and we empty it
    var aux = this.messageQueue;
    this.messageQueue = [];
    return aux;
};
Component.prototype.receive = function(message) {
};


//////////////////////////////////////////////////////////////////////////////

function Game(entities) {
    this.entities = entities;
    this.messageQueue = [];
}

Game.prototype.mainLoop = function (ticks) {
    var i = 0;
    function line() {
        console.log("-----------------------------------------");
    }
    while(!ticks || i < ticks) {
        line();
        console.log("Tick number " + i);
        line();
        this.tick();
        i++;
    }
};

// Each tick, all entities are notified by calling their `tick` function
Game.prototype.tick = function () {
    var self = this;
    
    // We create `Presence` messages for all entities to let others that they
    // exists in the game

    if (this.firstTurn){
        this.entities.forEach(function(entity) {
            self.messageQueue.push(new Presence(entity));
        });
        self.firstTurn = false;
        
    }

    // All messages coming from the entities are put in the queue
    this.entities.forEach(function(entity) {
        var tickMessages = entity.tick();

        tickMessages.forEach(function(tickMessage) {
            self.messageQueue.push(tickMessage);
        });
    });

    this.deliver();
};
Game.prototype.firstTurn = true;

// All messages in the queue are delivered to all the entities
Game.prototype.deliver = function() {
    var self = this;

    this.messageQueue.forEach(function(message) {
        if(!message.receiver) {         
            self.entities.forEach(function(entity) {
                entity.receive(message);
            });
        }
        else {
            message.receiver.receive(message);
        }
    });

    this.messageQueue = [];
};

//////////////////////////////////////////////////////////////////////////////
// Components
//////////////////////////////////////////////////////////////////////////////
function Attacker(entity) {
    Component.call(this, entity);
}
Attacker.prototype = Object.create(Component.prototype);
Attacker.prototype.constructor = Attacker;

Attacker.prototype.receive = function(message) {
    if(message instanceof Presence) {

        if(message.who.type != this.entity.type) {
            this.messageQueue.push(new Attack(this.entity, message.who));
        }
    }
};

//////////////////////////////////////////////////////////////////////////////
function Defender(entity) {
    Component.call(this, entity);

}
Defender.prototype = Object.create(Component.prototype);
Defender.prototype.constructor = Defender;

//Si te defiendes estás vivo
Defender.prototype.life = 100;
Defender.prototype.alive = true;

Defender.prototype.receive = function(message) {
    // La primera vez que recibimos un se recibe un mensaje por parte de defender 
    // se marca la vida del personaje.
    if(this.alive)
	this.alive = false;
    if(message instanceof Attack) {
	    this.life -= 5;
        console.log(this.entity.entityName + " was attacked by " +
		message.who.entityName + ". Life = " + this.life);
    }
    if (message instanceof Heal){
	    this.life += 5;
        console.log(this.entity.entityName + " healed himself " + ". Life = " + this.life);
    }
};
//////////////////////////////////////////////////////////////////////////////
function Sleepy(entity){
	Component.call(this, entity);
}
Sleepy.prototype = Object.create(Component.prototype);
Sleepy.prototype.constructor = Sleepy;

Sleepy.prototype.receive = function(message){
	//Generamos un aleatorio que mide la posibilidad de despertarse
var cont = 0;

	if (message instanceof Sleep){
	// Esta función la sobreescribimos, pero es exactamente igual,
	// solo que la unica forma de que envie mensajes es que sean mensajes de despertarse
	// que recibirá la misma entidad
		this.entity.tick = function(){console.log(message.receiver.entityName +' is sleepping');
		var outcoming = [];
		this.components.forEach(function(component) {
      		   var messages = component.tick();
      		   messages.forEach(function (message) {
			   if (message instanceof WakeUp)
         	   		outcoming.push(message);
       		   });
   		});
        
		return outcoming;		
		}
        
	}
	//Despertamos si recibimos un ataque con una probabilidad de un 10%
	if (message instanceof Presence){
        cont++;
	}
    if (cont>2)
        this.messageQueue.push(new WakeUp(this.entity));
	if (message instanceof WakeUp){
	   this.entity.tick = Entity.prototype.tick;
	   console.log( message.receiver.entityName+ " woke up");
	}

}
//////////////////////////////////////////////////////////////////////////////
function Sleeper(entity){
	Component.call(this, entity);
}
Sleeper.prototype = Object.create(Component.prototype);
Sleeper.prototype.constructor = Sleeper;

Sleeper.prototype.receive = function(message) {
    if(message instanceof Presence) {
        if(message.who.type != this.entity.type) {
            this.messageQueue.push(new Sleep(message.who));
        }
    }
}
//////////////////////////////////////////////////////////////////////////////
function Healer(entity){
	Component.call(this, entity);
}
Healer.prototype = Object.create(Component.prototype);
Healer.prototype.constructor = Healer;



Healer.prototype.receive = function(message) {
    if(message instanceof Presence) {
	    if(message.who.type === this.entity.type) {
            this.messageQueue.push(new Heal(this.entity, message.who));
        }
    }
}
//////////////////////////////////////////////////////////////////////////////
function Able(entity){
    Component.call(this, entity);
}
Able.prototype = Object.create(Component.prototype);
Able.prototype.constructor = Able;


Able.prototype.receive = function(message) {
    if(message instanceof Presence) {
        this.messageQueue.push(new Presence(this.entity, message.who));
        Game.firstTurn = true;
    }
}
/////////////////////////////////////////////////////////////////////////////
function Movable (entity){
    Component.call(this, entity);
}
Movable.prototype = Object.create(Component.prototype);
Movable.prototype.constructor = Movable;

Movable.prototype.receive = function (message){
    if (message instanceof Move){
        console.log(entity + ": I'm movin' all da way");
    }
}
//////////////////////////////////////////////////////////////////////////////
function Physical(entity){
    Component.call(this, entity);
}
Physical.prototype = Object.create(Component.prototype);
Physical.prototype.constructor = Physical;

Physical.prototype.receiver = function(message){
    if (message instanceof Collision){
        console.log ("Hey there!, i'm here, be careful");
    }
}
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Messages
//////////////////////////////////////////////////////////////////////////////
function Presence(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Presence.prototype = Object.create(Message.prototype);
Presence.prototype.constructor = Presence;
//////////////////////////////////////////////////////////////////////////////
function Attack(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Attack.prototype = Object.create(Message.prototype);
Attack.prototype.constructor = Attack;
//////////////////////////////////////////////////////////////////////////////
function Sleep(receiver){
	Message.call(this, receiver);
}
Sleep.prototype = Object.create(Message.prototype);
Sleep.prototype.constructor = Sleep;
//////////////////////////////////////////////////////////////////////////////
function WakeUp(receiver){
	Message.call(this, receiver);
}
WakeUp.prototype = Object.create(Message.prototype);
WakeUp.prototype.constructor = WakeUp;
//////////////////////////////////////////////////////////////////////////////
function Heal(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Heal.prototype = Object.create(Message.prototype);
Heal.prototype.constructor = Heal;
//////////////////////////////////////////////////////////////////////////////
function Move(receiver){
    Message.call(this, receiver);
}
Move.prototype = Object.create(Message.prototype);
Move.prototype.constructor= Move;
//////////////////////////////////////////////////////////////////////////////
function Collision(receiver){
    Message.call(this, receiver);
}
Collision.prototype = Object.create(Message.prototype);
Collision.prototype.constructor = Collision;
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// helper functions creating new components
var attacker = function() { return new Attacker(); };
var defender = function() { return new Defender(); };
var sleepy = function() {return new Sleepy(); }; 
var sleeper = function() {return new Sleeper(); };
var healer = function() {return new Healer(); };
var able = function() {return new Able();};

// entities in the game
var link = new Entity("link", EntityType.GOOD, [attacker(), defender(), sleeper(), healer(), able()]);
var ganon = new Entity("ganon", EntityType.EVIL, [attacker(), defender(), sleepy(), able()]);
var octorok = new Entity("octorok", EntityType.EVIL, [defender(), able()]);
var armos = new Entity("armos", EntityType.EVIL, [attacker(), able()]);
var cloud = new Entity("cloud", EntityType.GOOD, [Movable(), able()]);
var rock = new Entity ("rock", EntityType.GOOD, [physical(), able()]);
var ball = new Entity("ball", EntityType.GOOD,[physical(), movable(), able()]); 
// we create the game with the entities
var game = new Game([link, ganon, armos, octorok, cloud, rock, ball]);

game.mainLoop(10);
