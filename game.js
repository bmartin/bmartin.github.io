var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

ctx.canvas.width = innerWidth;
ctx.canvas.height = innerHeight;


// Game object system functions

function AssertRequiredFields (o, requiredFields) {
    for (var i = 0; i < requiredFields.length; i++) {
        if (!(requiredFields[i] in o)) {
            throw new Error('animals require ' + requiredFields[i]);
        }
    }
    return;
}

function createInvisibleBoundingBox (pos, size, bounce_rho) {
    // No mass is the same as infinite
    var o = {
        "pos"  : pos,
        "size" : size,
        "v"    : [0, 0],
        "a"    : [0, 0],
        "bounce_rho" : bounce_rho
    };
    return o;
}

function inBox (x, y) {
    return (   x > this.pos[0] && x < this.pos[0] + this.size[0]
            && y > this.pos[1] && y < this.pos[1] + this.size[1]);                  ;
}

function createUIObject (pos, z, size) {
    return {
        pos : [...pos],
        z : z,
        size : [...size],
        hidden : false,
        inBox : inBox
    };
}
function createUIButton (pos, z, size) {
    var o = createUIObject(pos, z, size);
    o.draw = function () {
        ctx.fillStyle = "#000a";
        ctx.fillRect(this.pos[0], this.pos[1], this.size[0], this.size[1]);
        ctx.strokeStyle = "#dfd";
        ctx.strokeRect(this.pos[0], this.pos[1], this.size[0], this.size[1]);
        this.drawIcon([ this.pos[0] + 5, this.pos[1] + 5, this.size[0] - 10, this.size[1] - 10]);
    };
    return o;
}

function createUITextButton (pos, z, size, text) {
    var o = createUIButton(pos, z, size);
    o.text = text;
    o.drawIcon = function (box) {
        ctx.font = "20px Arial";
        ctx.fillStyle = "#dfd";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.text, box[0] + box[2] / 2, box[1] + box[3] / 2, box[3]);
    };
    return o;
}

function createUIObjectButton (pos, z, size, iconObject) {
    var o = createUIButton(pos, z, size);
    o.iconObject = iconObject;
    o.drawIcon = function (box) {
        this.iconObject.draw(box);
    };
    return o;
}

function createStarField(x, y, w, h, numStars) {
    var starField = {
        pos : [x, y],
        "size" : [w, h],
        z : Infinity,
        "stars" : [],
        "draw": function(box) {
            ctx.fillStyle = "#000";
            ctx.fillRect(box[0], box[1], box[2], box[3]);

            // Star position obeys zoom, but size does not.
            var zoom = box[2] / this.size[0];
            for (var i = 0; i < this.stars.length; i++) {
                var star = this.stars[i];
                var screenX = star[0] * zoom + box[0];
                var screenY = star[1] * zoom + box[1];
                var screenR = star[2];
                var visible = screenX + screenR > 0 && screenX - screenR < box[2] &&
                              screenY + screenR > 0 && screenY - screenR < box[3];
                if (visible) {
                    ctx.beginPath();
                    ctx.fillStyle = "#eee";
                    ctx.arc(screenX, screenY, screenR, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.closePath();
                }
            }
            return;
        }
    };
    for (var i = 0; i < numStars; i++) {
        starField.stars.push([w * Math.random(), h * Math.random(), 5 * Math.random()]);
    }
    return starField;
}

function createGroundBackground(x, y, w, h) {
    var obj = {
        pos   : [x, y],
        size  : [w, h],
        z     : 1000,
        draw  : function(box) {
            ctx.fillStyle = "#336600";
            ctx.fillRect(box[0], box[1], box[2], box[3]);
            return;
        }
    };
    return obj;
}

// Add a fence that is mildly broken.
function createFence(x, y, w, h) {
    var obj = {
        pos   : [x, y],
        size  : [w, h],
        z     : -5,
        slats : [],
        draw  : function(box) {
            ctx.fillStyle = "#fff1c9";
            ctx.strokeStyle = "#d19d08";
            for (var i = 0; i < this.slats.length; i++) {
                ctx.fillRect(box[0], box[1] + this.slats[i] * box[3], box[2], .05 * box[3]);
            }
            ctx.fillRect(box[0], box[1], 0.1 * box[2], box[3]);
            ctx.strokeRect(box[0], box[1], 0.1 * box[2], box[3]);
            ctx.fillRect(  box[0] + 0.9 * box[2], box[1], 0.1 * box[2], box[3]);
            ctx.strokeRect(box[0] + 0.9 * box[2], box[1], 0.1 * box[2], box[3]);
            return;
        }
    };
    if (Math.random() > .07) {
        obj.slats.push(.1);
    }
    if (Math.random() > .07) {
        obj.slats.push(.4);
    }
    if (Math.random() > .07) {
        obj.slats.push(.7);
    }
    return obj;
}

function createSilo(x, z, w, h, world) {
    var obj = {
        pos   : [x, 0.95 * world.size[1] - h],
        size  : [w, h],
        z     : z,
        draw  : function(box) {
            
            const topRadius = 0.5 * box[2];
            const xCenter = box[0] + 0.5 * box[2];
            
            // Top of Silo
            ctx.fillStyle = "#d3d3d3";
            ctx.strokeStyle = "#000000";
            ctx.beginPath();
            ctx.ellipse(xCenter, box[1] + topRadius, topRadius, topRadius, 0, Math.PI, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
            
            // Body of silo
            ctx.fillStyle = "#de1826";
            ctx.strokeStyle = "#d3d3d3";
            ctx.fillRect(box[0], box[1] + topRadius, box[2], box[3] - topRadius);
            ctx.strokeRect(box[0], box[1] + topRadius, box[2], box[3] - topRadius);
            
            const layerHeightM = 1;
            const boxHeightM = this.size[1] - 0.5 * this.size[0];
            for (var heightM = layerHeightM; heightM < boxHeightM; heightM = heightM + layerHeightM) {
                var heightP = box[3] * heightM / this.size[1];
                var layerY = box[1] + box[3] - heightP;
                ctx.beginPath();
                ctx.moveTo(box[0], layerY);
                ctx.lineTo(box[0] + box[2], layerY);
                ctx.stroke();
                ctx.closePath();
            }
            return;
        }
    };
    return obj;
}

function createBarn(x, y, z, w, h, d) {
    var barnObjects = [];
    // Back wall
    // Main body
    var barnBack = {
        pos   : [x, y],
        size  : [w, h],
        z     : z + d,
        shape : [
            [0.0, 0.2],
            [0.1, 0.1],
            [0.3, 0.0],
            [0.7, 0.0],
            [0.9, 0.1],
            [1.0, 0.2],
            [1.0, 1.0],
            [0.0, 1.0]
        ],
        draw  : function(box) {
            ctx.fillStyle = "#5C4033";
            ctx.strokeStyle = "#000000";

            ctx.beginPath();
            ctx.moveTo(box[0] + this.shape[0][0] * box[2], box[1] + this.shape[0][1] * box[3]);
            for (var i = 1; i < this.shape.length; i++) {
                ctx.lineTo(box[0] + this.shape[i][0] * box[2], box[1] + this.shape[i][1] * box[3]);
            }
            ctx.lineTo(box[0] + this.shape[0][0] * box[2], box[1] + this.shape[0][1] * box[3]);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
            return;
        }
    };
    barnObjects.push(barnBack);
    var barnFront = {
        pos   : [x, y],
        size  : [w, h],
        z     : z,
        shape : [
            [0.0, 0.2],
            [0.1, 0.1],
            [0.3, 0.0],
            [0.7, 0.0],
            [0.9, 0.1],
            [1.0, 0.2],
            [1.0, 1.0],
            [0.7, 1.0],
            [0.7, 0.7],
            [0.3, 0.7],
            [0.3, 1.0],
            [0.0, 1.0]
        ],
        draw  : function(box) {
            ctx.fillStyle = "#ff0000";
            ctx.strokeStyle = "#000000";

            ctx.beginPath();
            ctx.moveTo(box[0] + this.shape[0][0] * box[2], box[1] + this.shape[0][1] * box[3]);
            for (var i = 1; i < this.shape.length; i++) {
                ctx.lineTo(box[0] + this.shape[i][0] * box[2], box[1] + this.shape[i][1] * box[3]);
            }
            ctx.lineTo(box[0] + this.shape[0][0] * box[2], box[1] + this.shape[0][1] * box[3]);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            const boards = Math.floor(1.5 * w);
            for (var i = 1; i < boards; i++) {
                const x = box[0] + (i / boards) * box[2];
                const yTop = (x < box[0] + 0.1 * box[2]) ? (box[1] + 0.1 * box[3]) :
                             (x < box[0] + 0.9 * box[2]) ? (box[1] + 0.0 * box[3]) :
                                                           (box[1] + 0.1 * box[3]);
                const yBot = (x < box[0] + 0.3 * box[2]) ? (box[1] + box[3]) :
                             (x < box[0] + 0.7 * box[2]) ? (box[1] + 0.7 * box[3]) :
                                                           (box[1] + box[3]);
                ctx.beginPath();
                ctx.moveTo(x, yTop);
                ctx.lineTo(x, yBot);
                ctx.stroke();
            }

            return;
        }
    };
    barnObjects.push(barnFront);

    var barnDoors = {
        pos   : [x, y],
        size  : [w, h],
        z     : z - 0.1,
        open  : 0,
        openSeconds : 5,
        opening  : 1,
        closing  : 0,
        draw  : function(box) {
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#000000";

            for (var i = 0; i < 2; i++) {
                var x = box[0] + box[2] * ((i == 0 ? (0.3 - 0.2 * this.open) : (0.5 + 0.2 * this.open)));
                var width =  0.2 * box[2];
                var yTop  = box[1] + 0.7 * box[3];
                var height = 0.3 * box[3];
                ctx.beginPath();
                ctx.moveTo(x, yTop);
                ctx.lineTo(x + width, yTop);
                ctx.lineTo(x + width, yTop + height);
                ctx.lineTo(x, yTop + height);
                ctx.lineTo(x, yTop);
                ctx.moveTo(x + 0.2 * width, yTop + 0.1 * height);
                ctx.lineTo(x + 0.5 * width, yTop + 0.4 * height);
                ctx.lineTo(x + 0.9 * width, yTop + 0.1 * height);
                ctx.lineTo(x + 0.2 * width, yTop + 0.1 * height);
                // Bottom triangle
                ctx.moveTo(x + 0.2 * width, yTop + 0.9 * height);
                ctx.lineTo(x + 0.9 * width, yTop + 0.9 * height);
                ctx.lineTo(x + 0.5 * width, yTop + 0.6 * height);
                ctx.lineTo(x + 0.2 * width, yTop + 0.9 * height);

                ctx.moveTo(x + 0.1 * width, yTop + 0.2 * height);
                ctx.lineTo(x + 0.1 * width, yTop + 0.8 * height);
                ctx.lineTo(x + 0.4 * width, yTop + 0.5 * height);
                ctx.lineTo(x + 0.1 * width, yTop + 0.2 * height);

                ctx.moveTo(x + 0.9 * width, yTop + 0.2 * height);
                ctx.lineTo(x + 0.6 * width, yTop + 0.5 * height);
                ctx.lineTo(x + 0.9 * width, yTop + 0.8 * height);
                ctx.lineTo(x + 0.9 * width, yTop + 0.2 * height);

                ctx.fill();
                ctx.stroke();
            }

            return;
        },
        "update" : function(delta_ms, world) {
            if (this.opening) {
                this.open = this.open + delta_ms / (1000 * this.openSeconds);
                if (this.open > 1.0) {
                    this.open = 1;
                    this.opening = 0;
                    // for demo
                    this.closing = 1;
                }
            } else if (this.closing) {
                this.open = this.open - delta_ms / (1000 * this.openSeconds);
                if (this.open < 0.0) {
                    this.open = 0;
                    this.closing = 0;
                    // for demo
                    this.opening = 1;
                }
            }
            return;
        }
    };
    barnObjects.push(barnDoors);

    var barnRoof = {
        pos   : [x, y],
        size  : [w, h],
        z     : z - 1,
        shape : [
            [-0.1, 0.3],
            [ 0.1, 0.1],
            [ 0.3, 0.0],
            [ 0.7, 0.0],
            [ 0.9, 0.1],
            [ 1.1, 0.3],
            [ 1.2, 0.2],
            [ 0.9, 0.0],
            [ 0.7,-0.1],
            [ 0.3,-0.1],
            [ 0.1, 0.0],
            [-0.2, 0.2]
        ],
        draw  : function(box) {
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#000000";

            ctx.beginPath();
            ctx.moveTo(box[0] + this.shape[0][0] * box[2], box[1] + this.shape[0][1] * box[3]);
            for (var i = 1; i < this.shape.length; i++) {
                ctx.lineTo(box[0] + this.shape[i][0] * box[2], box[1] + this.shape[i][1] * box[3]);
            }
            ctx.lineTo(box[0] + this.shape[0][0] * box[2], box[1] + this.shape[0][1] * box[3]);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
            return;
        }
    };
    barnObjects.push(barnRoof);
    return barnObjects;
}

function createAtmosphere(x, y, w, h) {
    var obj = {
        pos   : [x, y],
        size  : [w, h],
        z : 1000,
        draw  : function(box) {
            // Create a linear gradient
            // The start gradient point is at x=20, y=0
            // The end gradient point is at x=220, y=0
            var gradient = ctx.createLinearGradient(box[0], box[1], box[0], box[1] + box[3]);

            // Add three color stops
            gradient.addColorStop(0, '#00000000');
            // Top of space
            gradient.addColorStop(0.25, '#00000000');
            // Upper atmosphere
            gradient.addColorStop(.5, "#4bc5ff22");
            // ground
            gradient.addColorStop(.9, "#4bc5ffff");
            gradient.addColorStop(.95, "#4bc5ff22");
            gradient.addColorStop(1, "#4bc5ff00");

            // Set the fill style and draw a rectangle
            ctx.fillStyle = gradient;
            ctx.fillRect(box[0], box[1], box[2], box[3]);
            return;
        }
    };
    return obj;
}

var updatePhysicsSub = function(delta_ms, world) {
    var delta_s =  delta_ms / 1000.0;

    // Update speed (subject to collision)
    for (var i = 0; i < 2; i++) {
        this.v[i] = this.v[i] + this.a[i] * delta_s;
    }

    // Move with previous speed
    var next_pos = [
        this.pos[0] + this.v[0] * delta_s,
        this.pos[1] + this.v[1] * delta_s
    ];

    // Collision detection
    var first_collide_obj = null;
    var first_collide_pos = [...next_pos];
    var first_collide_v = [...this.v];
    var first_collide_distance = null;
    var no_collide_distance = Math.sqrt(
        (next_pos[0] - this.pos[0]) * (next_pos[0] - this.pos[0])
        + (next_pos[1] - this.pos[1]) * (next_pos[1] - this.pos[1]));

    OTHER:
    for (var iObj = 0; iObj < world.objects.length; iObj++) {
        var other = world.objects[iObj];
        if (other === this) {
            continue OTHER;
        }
        if (!('bounce_rho' in other)) {
            // not a physics object
            continue OTHER;
        }
        // Need to check for intersection
        //      --      --
        //     |  | -> |  |
        //      --      --

        var collide_pos = [...next_pos];
        var collide_v = [...this.v];
        for (var i = 0; i < 2; i++) {
            if (this.v[i] > 0) {
                if (this.pos[i] > other.pos[i] + other.size[i]) {
                    // Already past object
                    //     [other] [this]->
                    continue OTHER;
                } else if (next_pos[i] + this.size[i] < other.pos[i]) {
                    // Doesn't reach object
                    //     [this]-> [other]
                    continue OTHER;
                } else {
                    // Might collide, or might already be inside
                    if (this.pos[i] + this.size[i] < other.pos[i] + 0.25) {
                        // True collision
                        //     [this]---[-> other]

                        // ToDo: Add conservation of momentum.
                        collide_pos[i] = other.pos[i] - this.size[i] - Number.EPSILON;
                        collide_v[i] = -1 * this.bounce_rho * other.bounce_rho * this.v[i];
                    } else {
                        // This dimension already satisfied, bot other might collide
                    }
                }
            } else if (this.v[i] < 0) {
                if (this.pos[i] + this.size[i] < other.pos[i]) {
                    // Already past object
                    //     <-[this] [other]
                    continue OTHER;
                } else if (next_pos[i] > other.pos[i] + other.size[i]) {
                    // Doesn't reach object
                    //     [other] <-fi[this]
                    continue OTHER;
                } else {
                    // Might collide, or might already be inside
                    if (this.pos[i] > other.pos[i] + other.size[i] - 0.25) {
                        // True collision
                        collide_pos[i] = other.pos[i] + other.size[i] + Number.EPSILON;
                        // ToDo: Add conservation of momentum.
                        collide_v[i] = -1 * this.bounce_rho * other.bounce_rho * this.v[i];
                    }
                }
            } else {
                // Effectively not moving in this dimension,
                if (this.pos[i] + this.size[i] < other.pos[i]) {
                    // Before object
                    //     [this] [other]
                    continue OTHER;
                } else if (this.pos[i] > other.pos[i] + other.size[i]) {
                    // After object
                    //     [other] [this]
                    continue OTHER;
                } else {
                    // Might collide
                }
            }
        }

        // If we got here, then they collided. Now see if this was the first collision
        var collide_distance = Math.sqrt(
            (collide_pos[0] - this.pos[0]) * (collide_pos[0] - this.pos[0])
            + (collide_pos[1] - this.pos[1]) * (collide_pos[1] - this.pos[1])
        );
        if (first_collide_distance === null || collide_distance < first_collide_distance) {
            // Tentatively mark this as the first collision
            first_collide_distance = collide_distance;
            first_collide_obj = other;
            first_collide_pos = collide_pos;
            first_collide_v = collide_v;
        }
    }

    if (first_collide_obj !== null) {
        this.pos = first_collide_pos;

        // Collision damage
        if ('health' in this) {
            var speedChange = Math.sqrt((this.v[0] - first_collide_v[0]) * (this.v[0] - first_collide_v[0])
                 + (this.v[1] - first_collide_v[1]) * (this.v[1] - first_collide_v[1]));
            if (speedChange < .5) {
                // No damage
            } else {
                // Damage is based on
                this.health = this.health - speedChange;
                if (this.health < 0) {
                    this.health = 0;
                }
            }
        }
        this.v = first_collide_v;
    } else {
        this.pos = next_pos;
    }

    // Stay in play-field (remove once edges have bounding boxes.)
    for (var i = 0; i < 2; i++) {
        // Move in current direction
        if (this.pos[i] < 0) {
            this.pos[i] = 0;
            // Bounce off side wall
            this.v[i] = this.bounce_rho * Math.abs(this.v[i]);
        }
        if (this.pos[i] + this.size[i] > world.size[i]) {
            this.pos[i] = world.size[i] - this.size[i];
            this.v[i] = -1 * this.bounce_rho * Math.abs(this.v[i]);
        }
    }

    return;
};


function drawHayBale (box) {
    var x = box[0];
    var y = box[1];
    var w = box[2];
    var h = box[3];

    ctx.strokeStyle = "rgb(185, 130, 0)";

    // front
    ctx.fillStyle = "rgb(255, 186, 20)";
    ctx.beginPath();
    ctx.moveTo(x + 0.2 * w, y + 0.2 * h);
    ctx.lineTo(x + 0.2 * w, y + 1.0 * h);
    ctx.lineTo(x + 1.0 * w, y + 1.0 * h);
    ctx.lineTo(x + 1.0 * w, y + 0.2 * h);
    ctx.lineTo(x + 0.2 * w, y + 0.2 * h);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // top
    ctx.fillStyle = "rgb(248, 235, 0)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.2 * w, y + 0.2 * h);
    ctx.lineTo(x +       w, y + 0.2 * h);
    ctx.lineTo(x + 0.8 * w, y);
    ctx.lineTo(x, y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // left side
    ctx.fillStyle = "rgb(255, 210, 5)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + .2 * w, y + 0.2 * h);
    ctx.lineTo(x + .2 * w, y +       h);
    ctx.lineTo(x,          y + 0.8 * h);
    ctx.lineTo(x, y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // rope
    ctx.beginPath();
    ctx.moveTo(x + 0.25 * w, y + 0.0 * h);
    ctx.lineTo(x + 0.45 * w, y + 0.2 * h);
    ctx.lineTo(x + 0.45 * w, y + 1.0 * h);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(x + 0.55 * w, y + 0.0 * h);
    ctx.lineTo(x + 0.75 * w, y + 0.2 * h);
    ctx.lineTo(x + 0.75 * w, y + 1.0 * h);
    ctx.stroke();
    ctx.closePath();
    return;
}


function createPhysicsObject (startPos, size, mass_kg, bounce_rho) {

    var o = {
        "pos"  : startPos,
        "size" : size,
        "v"    : [0, 0],
        "a"    : [0, 0],
        "mass_kg" : mass_kg,
        "bounce_rho" : bounce_rho,
        "updatePhysics" : updatePhysicsSub,
        "update" : function(delta_ms, world) {

            // Adjust acceleration based on input forces
            var f = [0, 0];

            // Drag can be modeled more accurately than this.

            // Density in atmospheres
            var density = 1;
            f[0] = f[0] - Math.sign(this.v[0]) * 0.1 * density * this.v[0] * this.v[0];
            f[1] = f[1] - Math.sign(this.v[0]) * 0.1 * density * this.v[1] * this.v[1];

            // Gravity
            //   F = m * a => F = m * g
            if (this.mass_kg) {
                f[1] = f[1] + world.g * this.mass_kg;
            }

            this.a[0] = f[0] / this.mass_kg;
            this.a[1] = f[1] / this.mass_kg;

            // Move based on acceleration
            this.updatePhysics(delta_ms, world);
        }
    };
    return o;
}

function createHayBale () {
    var startPos = [0, 0];

    // 16" x 18" x 4', 100 lb
    var w_m = 4 * 12 * 2.54 / 100;
    var h_m = 16 * 2.54 / 100;
    var d_m = 18 * 2.54 / 100;

    // Mass is a function of the volume.
    // Approximate as sphere of 50% aluminum by volume.
    // Aluminum is 2.7 g/cm^3, which is 2,710kg/m^3
    var volume_m3 = w_m * h_m * d_m;
    var mass_kg = 100 / 2.2;

    var o = createPhysicsObject(startPos, [w_m, h_m], mass_kg, 0.1);
    o.draw = drawHayBale;

    return o;
}

// Animal growth chart
function createGrowthChart (growth_chart) {
    growth_chart.compute_size = function (age_seconds) {
        var age_in_months = age_seconds / (30 * 24 * 3600);

        var weight_lbs = this.weight_lbs[this.weight_lbs.length-1];
        var height_in  = this.height_in[this.weight_lbs.length-1];
        for (var i = 1; i < growth_chart.age_months.length; i++) {
            if (this.age_months[i] > age_in_months) {
                // to do: replace with smooth growth
                var r = (age_in_months - this.age_months[i-1]) / (this.age_months[i] - this.age_months[i-1]);
                height_in  = (1 - r) * this.height_in[i-1]  + r * this.height_in[i];
                weight_lsb = (1 - r) * this.weight_lbs[i-1] + r * this.weight_lbs[i];
                continue;
            }
        }
        return [ weight_lbs / 2.2, height_in * 2.54 / 100];
    };
    return growth_chart;
}

// Animals live and grow.
function addAnimalRole (o) {
    // Animals require:
    AssertRequiredFields(o, [
        'maxAge_s', 'health', 'maxHealth', 'die',
        'growthChart', 'growthRate',
        // Physics
        'pos', 'size'
    ]);

    if (!('age_s' in o)) {
        o.age_s = 0;
    }

    o.alpha = 1;

    // Update initial size
    var result = o.growthChart.compute_size(this.age_s);
    o.mass_kg = result[0];
    // Animals grow upward with feet in same place
    o.pos[1] = o.pos[1] + o.size[1] - result[1];
    o.size = [1.5 * result[1], result[1]];

    var updateFcn = o.update;
    o.update = function (delta_ms, world) {
        this.age_s = this.age_s + delta_ms / 1000 * this.growthRate;

        // die of old age
        if (this.alive && this.age_s > this.maxAge_s) {
            this.health = 0;
            this.die();
        }

        // Grow
        if (this.health > 0) {
            var result = this.growthChart.compute_size(this.age_s);
            this.mass_kg = result[0];
            // Cows grow upward with feet in same place
            this.pos[1] = this.pos[1] + this.size[1] - result[1];
            this.size = [1.5 * result[1], result[1]];
        } else {
            // Decay and then disappear
            this.alpha = this.alpha - delta_ms / 10000;
            if (this.alpha < 0) {
                world.removeObject(this);
            }
        }

        // Adjust acceleration based on input forces
        var f = [0, 0];

        // Drag can be modeled more accurately than this.

        // Density in atmospheres
        var density = 1;
        f[0] = f[0] - Math.sign(this.v[0]) * 0.1 * density * this.v[0] * this.v[0];
        f[1] = f[1] - Math.sign(this.v[0]) * 0.1 * density * this.v[1] * this.v[1];

        // Gravity
        //   F = m * a => F = m * g
        if (this.mass_kg) {
            f[1] = f[1] + world.g * this.mass_kg;
        }

        this.a[0] = f[0] / this.mass_kg;
        this.a[1] = f[1] / this.mass_kg;

        updateFcn.call(this, delta_ms, world);
        // Move based on acceleration
        this.updatePhysics(delta_ms, world);
        return;
    };

    return;
}

// Cow growth chart
function createCowGrowthChart () {
    var growth_chart = {
        age_months : [0,     1,    2,    3,    4,    5,    6,    7,    8,   9,    10,   11,   12,   14,   16,   18,   20, 60,     96],
        weight_lbs : [90,  115,  155,  205,  260,  318,  380,  438,  490, 543,   590,  635,  685,  753,  820,  890,  960, 1345, 1364],
        height_in :  [29, 30.5, 32.2, 34.3, 36.3, 37.7, 39.5, 41.2, 42.5, 43.6, 44.5, 45.2, 46.0, 47.5, 48.6, 49.5, 50.5, 54.3, 54.3]
    };
    growth_chart = createGrowthChart(growth_chart);
    return growth_chart;
}

function createCow () {
    var startPos = [0, 0];
    var o = createPhysicsObject(startPos, [1, 1], 1, 0.1);

    o.maxAge_s = 8 * 365 * 24 * 3600;
    o.growthChart = createCowGrowthChart();
    o.growthRate  = 12 * 30 * 24 * 3600 / 60;
    o.die = function () {
        this.bodyMainColor = "#353";
        return;
    };
    var oldUpdate = o.update;
    o.update = function (delta_ms, world) {
        // Handle AI here

        // Call previous update
        return oldUpdate.call(this, delta_ms, world);
    };

    o.health = 25;
    o.maxHealth = 25;
    addAnimalRole(o);

    var cowColorOptions = [ ["#FFF", "#000"], ["#000", "#FFF"], ["#FFF", "#8c3706" ], [ "#8c3706", "#FFF"] ];

    var cowColorScheme = cowColorOptions[Math.floor(Math.random() * cowColorOptions.length)]
    o.bodyMainColor = cowColorScheme[0];
    o.bodySpotColor = cowColorScheme[1];
    o.draw = function (box) {
        var x = box[0];
        var y = box[1];
        var w = box[2];
        var h = box[3];

        if (this.health > 0) {
            // Normal
        } else {
            // Gray-green body upside down
            y = y + h;
            h = -h;
        }

        if (this.v[0] < 0) {
            // Facing left
            x = x + w;
            w = - w;
        }

        // body
        ctx.strokeStyle = this.bodySpotColor;
        ctx.fillStyle = this.bodyMainColor;
        ctx.beginPath();
        // Main body
        ctx.rect(x + 0.0 * w, y + 0.2 * h, 0.8 * w, 0.5 * h);
        // back leg
        ctx.rect(x + 0.1 * w, y + 0.8 * h, 0.1 * w, 0.2 * h);
        // Front leg
        ctx.rect(x + 0.7 * w, y + 0.8 * h, 0.1 * w, 0.2 * h);
        // Head
        ctx.rect(x + 0.7 * w, y + 0.0 * h, 0.3 * w, 0.2 * h);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        // Patches
        ctx.beginPath();
        ctx.fillStyle = this.bodySpotColor;
        ctx.rect(x + 0.3 * w, y + 0.2 * h, 0.2 * w, 0.2 * h);
        ctx.rect(x + 0.0 * w, y + 0.3 * h, 0.2 * w, 0.2 * h);
        ctx.rect(x + 0.5 * w, y + 0.3 * h, 0.2 * w, 0.2 * h);
        ctx.fill();
        ctx.closePath();

        return;
    };

    return o;
}

function createShip (width_m, startPos) {

    // Mass is a function of the volume.
    // Approximate as sphere of 50% aluminum by volume.
    // Aluminum is 2.7 g/cm^3, which is 2,710kg/m^3
    var volume_m3 = 4 / 3 * Math.PI * (width_m / 2);
    var mass_kg = volume_m3 * 2710;

    // Define thrusters based on force required to accelerate at 1g.
    var liftingForce = mass_kg * 9.8;

    var ship = {
        "pos"  : startPos,
        "size" : [width_m, 0.75 * width_m],
        "v"    : [0, 0],
        "a"    : [0, 0],
        "mass_kg" : mass_kg,
        "bounce_rho" : 0.9,
        "maxV" : [50, 50],
        "autopilot" : true,
        "goal" : startPos,
        "jets" : [0, 0, 0],
        "jetMaxForce" : [1 * liftingForce, 3 * liftingForce, 1 * liftingForce],
        "jetAngles" : [0, 1.5 * Math.PI, Math.PI],
        "beams" : [],
        "inventory" : [],
        "health" : 100,
        "maxHealth" : 100,
        "healthRegenPerSecond" : 5,
        "beamHeight" : 5,
        "bodyStyle" : { "fillStyle" : "#eee", "strokeStyle" : "#444"},
        "accentStyle" : { "fillStyle" : "#e00", "strokeStyle" : "#000000ff"},
        "cockpitStyle" : { "fillStyle" : "rgb(95, 199, 199, 100)", "strokeStyle" : "rgb(40, 100, 100)"},
        "hatchOpenWidth" : 0,
        "cracks" : [],
        "draw": function(box) {
            // console.log("drawing ship");

            var x = box[0];
            var y = box[1];
            var xCenter = box[0] + box[2] / 2;
            var yCenter = box[1] + box[3] / 2;

            // Draw jets last so we can see them
            if (this.jets[0] > 0) {
                // to do: make transparency a function of force
                ctx.beginPath();
                ctx.fillStyle = "#ff3333";
                ctx.moveTo(xCenter, yCenter);
                ctx.lineTo(xCenter - 1.0 * box[2], yCenter + box[3] / 5);
                ctx.lineTo(xCenter - 1.2 * box[2], yCenter);
                ctx.lineTo(xCenter - 1.0 * box[2], yCenter - box[3] / 5);
                ctx.lineTo(xCenter, yCenter);
                ctx.closePath();
                ctx.fill();
            }
            if (this.jets[1] > 0) {
                // to do: make transparency a function of force
                ctx.beginPath();
                ctx.fillStyle = "#ff3333";
                ctx.moveTo(xCenter, yCenter);
                ctx.lineTo(xCenter + box[2] / 5, yCenter + 1.0 * box[3]);
                ctx.lineTo(xCenter,                    yCenter + 1.2 * box[3]);
                ctx.lineTo(xCenter - box[2] / 5, yCenter + 1.0 * box[3]);
                ctx.lineTo(xCenter, yCenter);
                ctx.closePath();
                ctx.fill();
            }
            if (this.jets[2] > 0) {
                // to do: make transparency a function of force
                ctx.beginPath();
                ctx.fillStyle = "#ff3333";
                ctx.moveTo(xCenter, yCenter);
                ctx.lineTo(xCenter + 1.0 * box[2], yCenter + box[3] / 5);
                ctx.lineTo(xCenter + 1.2 * box[2], yCenter);
                ctx.lineTo(xCenter + 1.0 * box[2], yCenter - box[3] / 5);
                ctx.lineTo(xCenter, yCenter);
                ctx.closePath();
                ctx.fill();
            }

            // Draw beams behind body
            var beamStartPos = [box[0] + box[2]/2, box[1] + box[3]];
            var beamHeight = box[3] * this.beamHeight;
            for (var i = 0; i < this.beams.length; i++) {
                var beamWidth = this.beams[i].width * box[2] / 4;
                // transparent green beam
                ctx.fillStyle = this.beams[i].fillStyle;
                ctx.beginPath();
                ctx.rect(beamStartPos[0] - beamWidth, beamStartPos[1], 2 * beamWidth, beamHeight);
                ctx.fill();
            }

            // Hatch - may be open with no beam.
            var hatchOpenWidth = this.hatchOpenWidth * box[2] / 4;
            ctx.fillStyle   = this.bodyStyle.fillStyle;
            ctx.strokeStyle = this.bodyStyle.strokeStyle;
            ctx.beginPath();
            ctx.rect(box[0] + 0.25 * box[2] - hatchOpenWidth, box[1] + .9 * box[3], .25 * box[2], 0.1 * box[3]);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.rect(box[0] + 0.5 * box[2] + hatchOpenWidth, box[1] + .9 * box[3], .25 * box[2], 0.1 * box[3]);
            ctx.fill();
            ctx.stroke();
            // Draw mini tractor beam
            if (hatchOpenWidth > 0 && this.health > 0) {
                ctx.fillStyle = '#0000FFAA';
                ctx.fillRect(box[0] + 0.5 * box[2] - hatchOpenWidth, box[1] + .9 * box[3], 2 * hatchOpenWidth, 0.2 * box[3]);
            }

            //body
            ctx.fillStyle   = this.bodyStyle.fillStyle;
            ctx.strokeStyle = this.bodyStyle.strokeStyle;
            ctx.beginPath();
            ctx.ellipse(xCenter, y + 0.66 * box[3], 0.5 * box[2], 0.33 * box[3], 0, 1.7 * Math.PI, 1.3 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            //body stripe
            ctx.fillStyle   = this.accentStyle.fillStyle;
            ctx.strokeStyle = this.accentStyle.strokeStyle;
            ctx.beginPath();
            ctx.ellipse(xCenter, y + 0.66 * box[3], box[2]/2, 0.05 * box[3], 0, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.ellipse(xCenter, y + 0.66 * box[3], this.health / this.maxHealth * box[2]/2, this.health / this.maxHealth * 0.05 * box[3], 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();

            // cockpit
            ctx.fillStyle   = this.cockpitStyle.fillStyle;
            ctx.strokeStyle = this.cockpitStyle.strokeStyle;
            ctx.beginPath();
            ctx.ellipse(xCenter, y + 0.4 * box[3], 0.3 * box[2], 0.4 * box[3], 0, Math.PI, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            for (var i = 0; i < this.cracks.length; i++) {
                var crack = this.cracks[i];
                ctx.strokeStyle = this.cockpitStyle.strokeStyle;
                ctx.beginPath();
                ctx.moveTo(box[0] + crack[0][0] * box[2], box[1] + crack[0][1] * box[3]);
                for (var iStroke = 1; iStroke < crack.length; iStroke++) {
                    ctx.lineTo(box[0] + crack[iStroke][0] * box[2], box[1] + crack[iStroke][1] * box[3]);
                }
                ctx.stroke();
                ctx.closePath();
            }

            // Items
            if (this.inventory.length > 0) {
                var inventoryBox = [box[0] + 0.25 * box[2], box[1] + 0.5 * box[3], 0.5 * box[2], 0.4 * box[3]];

                // Draw inventory box
                ctx.fillStyle = "#000a";
                ctx.fillRect(...inventoryBox);
                ctx.strokeStyle = "#dfd";
                ctx.strokeRect(...inventoryBox);

                var width = inventoryBox[2] / (1 + this.inventory.length);
                var gap = (inventoryBox[2] - width * this.inventory.length) / (this.inventory.length + 1);

                for (var i = 0; i < this.inventory.length; i++) {
                    // Draw item in ship
                    var item = this.inventory[i];
                    var height = width * item.size[1] / item.size[0];
                    var itemBox = [inventoryBox[0] + (i + 1) * gap + i * width,
                                   inventoryBox[1] + inventoryBox[3] - height,
                                   width, height ];
                    // Draw box
                    item.draw(itemBox);
                }
            }
        },
        "updatePhysics" : updatePhysicsSub,
        "updateAI" : function(delta_ms, world) {
            var xCenter = this.pos[0] + this.size[0] / 2;
            var yCenter = this.pos[1] + this.size[1] / 2;

            // Run autopilot
            if (this.goal) {
                var xErr = this.goal[0] - xCenter;
                var yErr = this.goal[1] - yCenter;

                // Fire horizontal jets toward goal
                if (this.v[0] < -this.maxV[0]) {
                    // Emergency shut off
                    this.jets[2] = 0;
                } else {
                    if (xErr < 3 * this.v[0]) {
                        // Accelerate toward goal
                        this.jets[2] = 1;
                    } else {
                        // Coast
                        this.jets[2] = 0;
                    }
                }

                if (this.v[0] > this.maxV[0]) {
                    // Emergency shut off
                    this.jets[0] = 0;
                } else {
                    if (xErr > 3 * this.v[0]) {
                        // Accelerate toward goal
                        this.jets[0] = 1;
                    } else {
                        // Coast
                        this.jets[0] = 0;
                    }
                }

                // Fire vertical jets toward goal
                if (this.v[0] <= -this.maxV[0]) {
                    // Emergency thruster shut off
                    this.jets[1] = 0;
                } else {
                    if (yErr < 3 * this.v[1]) {
                        // full power
                        this.jets[1] = 1;
                    } else {
                        this.jets[1] = 0;
                    }
                }
            }
            return;
        },
        "update" : function(delta_ms, world) {

            if (this.health <= 0) {
                // Turn off all jets
                for (var i = 0; i < this.jets.length; i++) {
                    this.jets[i] = 0;
                }

                // turn off all beams
                if (this.beams.length > 0) {
                    this.beams = [];
                }
            } else {

                if (this.health < this.maxHealth) {
                    // Automatic health
                    this.health = this.health + this.healthRegenPerSecond * delta_ms / 1000;
                    if (this.health > this.maxHealth) {
                        this.health = this.maxHealth;
                    }
                }

                if (this.autopilot) {
                    this.updateAI(delta_ms, world);
                }

                // Update tractor beams
                var maxBeamWidth = 0;
                var i = 0;
                while (i < this.beams.length) {
                    var beam = this.beams[i];

                    // Beams disappear over 1 second
                    beam.age_ms = beam.age_ms + delta_ms;
                    if (beam.age_ms > beam.maxAge_ms) {
                        // Delete empty beams
                        this.beams.splice(i, 1);
                    } else {
                        if (beam.age_ms < 0.5 * beam.maxAge_ms) {
                            // Beam growing to full size
                            beam.width = 2 * beam.age_ms / beam.maxAge_ms;
                        } else {
                            // Beam shrinking
                            beam.width = 2 * (beam.maxAge_ms - beam.age_ms) / beam.maxAge_ms;
                        }

                        if (beam.width > maxBeamWidth) {
                            maxBeamWidth = beam.width;
                        }

                        i++;
                    }
                }
                this.hatchOpenWidth = maxBeamWidth;
            }

            var numCracks = Math.floor(10 * (this.maxHealth - this.health) / this.maxHealth);
            if (this.cracks.length < numCracks) {
                // Add cracks at cockpit
                while (this.cracks.length < numCracks) {
                    var crack = [[ 0.3 + 0.4 * Math.random(), .4]];
                    for (var i = 0; i < 3; i++) {
                        var lastSpot = crack[crack.length-1];
                        var xTarget = 0.3 + 0.4 * Math.random();
                        var yTarget = 0.4 * Math.random();
                        crack.push([
                            (lastSpot[0] * (i + 1) + xTarget) / (i + 2),
                            (lastSpot[1] * (i + 1) + yTarget) / (i + 2)
                        ]);
                        crack.push([
                            (lastSpot[0] * (i + 2) + xTarget) / (i + 3),
                            (lastSpot[1] * (i + 2) + yTarget) / (i + 3)
                            ]);

                    }

                    this.cracks.push(crack);
                }
            } else if (this.cracks.length > numCracks) {
                // Remove cracks one at a time.
                this.cracks.pop();
            }

            // Adjust acceleration based on input forces
            var f = [0, 0];

            // Drag can be modeled more accurately than this.

            // Density in atmospheres
            var density = 1;
            f[0] = f[0] - Math.sign(this.v[0]) * 0.1 * density * this.v[0] * this.v[0];
            f[1] = f[1] - Math.sign(this.v[0]) * 0.1 * density * this.v[1] * this.v[1];

            // Gravity
            //   F = m * a => F = m * g
            if (this.mass_kg) {
                f[1] = f[1] + world.g * this.mass_kg;
            }

            // Jets
            for (var i = 0; i < this.jets.length; i++) {
                var force = this.jets[i] * this.jetMaxForce[i];
                f[0] = f[0] + Math.cos(this.jetAngles[i]) * force;
                f[1] = f[1] + Math.sin(this.jetAngles[i]) * force;
            }

            // Try to pick up objects
            var beamStartPos = [this.pos[0] + this.size[0] / 2, this.pos[1] + this.size[1]];
            var beamHeight = this.size[1] * this.beamHeight;
            for (var i = 0; i < world.objects.length; i++) {
                var other = world.objects[i];
                if (this === other) {
                    continue;
                }
                if (!('mass_kg' in other)) {
                    continue;
                }
                if (!('v' in other)) {
                    continue;
                }
                // Check if mob is in beam
                if (other.pos[1] + other.size[1] < beamStartPos[1]) {
                    // other is above this ship
                    continue;
                } else if (other.pos[1] > beamStartPos[1] + beamHeight) {
                    // Other is below beam
                    continue;
                }
                // Could be in  one of the beams
                for (var j = 0; j < this.beams.length; j++) {
                    var beamWidth = 0.25 * this.beams[j].width * this.size[0];
                    if (other.pos[0] > beamStartPos[0] - beamWidth && other.pos[0] < beamStartPos[0] + beamWidth) {
                        // In beam
                        other.v[1] = other.v[1] - 1;
                        // Pull down by weight of object picked up
                        f[1] = f[1] + other.mass_kg * world.g;
                    }
                }
            }

            if (this.hatchOpenWidth > 0) {
                // Look for objects to pick up
                var pickupBox = [this.pos[0] + 0.25 * this.size[0],
                                 this.pos[1] + 0.9 * this.size[1],
                                 0.5 * this.size[0], 0.2 * this.size[1]];
                var objects = world.getObjectsInBox(pickupBox);
                for (var i = 0; i < objects.length; i++) {
                    var other = objects[i];
                    if (this === other) {
                        continue;
                    }
                    if (!('mass_kg' in other)) {
                        continue;
                    }
                    if (!('v' in other)) {
                        continue;
                    }
                    // Time to grab it
                    this.inventory.push(other);
                    world.removeObject(other);
                    this.mass_kg = this.mass_kg + other.mass_kg;
                }
            }

            // Move based on acceleration
            this.a[0] = f[0] / this.mass_kg;
            this.a[1] = f[1] / this.mass_kg;

            this.updatePhysics(delta_ms, world);

            return;
        },
        handleMouseMove : function(x, y) {
            return;
        },
        addBeam : function () {
            this.beams.push({
                age_ms : 0,
                maxAge_ms : 1000,
                width : 0,
                fillStyle : "#00ff0080",
            });
            return;
        },
        dropItem : function (item, world) {
            // Item starts inside ship. This avoids possible bounding box problem
            item.pos = [this.pos[0] + this.size[0] / 2 - item.size[0] / 2,
                        this.pos[1] + this.size[1] - item.size[1]];
            item.v = [...this.v];
            world.objects.push(item);
            return;
        },
        addHayBale : function (world) {
            return this.dropItem(createHayBale(), world);
        },
        addCow : function (world) {
            return this.dropItem(createCow(), world);
        },
        handleClick : function(x, y, world) {
            if (this.health <= 0) {
                // clicking does nothing to a dead ship
                return;
            }

            if (   x > this.pos[0] && x < this.pos[0] + this.size[0]
                && y > this.pos[1] && y < this.pos[1] + this.size[1]) {
                // Clicked on ship, so turn on tractor beam
                this.addBeam();
            } else {
                // Fly to click spot
                this.autopilot = true;

                // Scale goal extra when in the border region
                this.goal = [x, y];
                for (var i = 0; i < 2; i++) {
                    if (this.goal[i] < world.view[i] + 0.25 * world.view[i+2]) {
                        this.goal[i] = 0;
                    }
                    if (this.goal[i] < 0) {
                        this.goal[i] = 0;
                    }
                    if (this.goal[i] > world.view[i] + 0.75 * world.view[i+2]) {
                        this.goal[i] = world.size[i];
                    }
                    if (this.goal[i] > world.size[i]) {
                        this.goal[i] = world.size[i];
                    }
                }
            }
            return;
        },
        disableAutoPilot : function () {
            if (this.autopilot) {
                // Turn off all jets and turn off autopilot
                for (var i = 0; i < this.jets.length; i++) {
                    this.jets[i] = 0;
                }
                this.autopilot = false;
            }
        },
        handleKeyDown : function(e, world) {
            if (this.health <= 0) {
                // clicking does nothing to a dead ship
                return;
            }

            if (e.keyCode == 39 || e.keyCode == 68) {
                // pushed right
                this.jets[0] = 1;
                this.disableAutoPilot();
            } else if(e.keyCode == 37 || e.keyCode == 65) {
                // pushed left
                this.jets[2] = 1;
                this.disableAutoPilot();
            } else if(e.keyCode == 38 || e.keyCode == 87) {
                // pushed up
                this.jets[1] = 1;
                this.disableAutoPilot();
            } else {
                console.log(e.keyCode);
            }
            return;
        },
        handleKeyUp : function(e, world) {
            if (this.health <= 0) {
                // clicking does nothing to a dead ship
                return;
            }

            if (e.keyCode == 39 || e.keyCode == 68) {
                // pushed right or d
                this.jets[0] = 0;
            } else if(e.keyCode == 37 || e.keyCode == 65) {
                // pushed left or a
                this.jets[2] = 0;
            } else if(e.keyCode == 38 || e.keyCode == 87) {
                // pushed up or w
                this.jets[1] = 0;
            } else if(e.keyCode == 32) {
                // drop a item from inventory
                if (this.inventory.length > 0) {
                    var o = this.inventory.pop();
                    this.mass_kg = this.mass_kg - o.mass_kg;
                    this.dropItem(o, world);
                }
            } else if(e.keyCode == 49) {
                // 1 -> drop a hay bale
                this.addHayBale(world);
            } else if(e.keyCode == 50) {
                // 1 -> drop a cow
                this.addCow(world);
            } else if(e.keyCode == 83 || e.keyCode == 40) {
                this.addBeam();
            }
            return;
        }
    };
    return ship;
}

var gameHudButtons = [];

function createCowGenerator () {
    var cowGenerator = {
        countdown_ms : 0,
        interval_s : 30,
        update : function(delta_ms, world) {
            this.countdown_ms = this.countdown_ms - delta_ms;
            if (this.countdown_ms <= 0) {
                world.addObjectOnGround(createCow());
                this.countdown_ms = this.interval_s * 1000;
            }
            return;
        }
    };
    return cowGenerator;
}

const gameHudZ = 0;

var hayBaleIcon = createHayBale();
var hayBaleButton = createUIObjectButton([canvas.width / 2, canvas.height - 40], gameHudZ, [30, 30], hayBaleIcon);
hayBaleButton.handleClick = function (x, y, world) {
    if (world.focus != null) {
        world.focus.addHayBale(world);
    }
};
hayBaleButton.hidden = true;
gameHudButtons.push(hayBaleButton);

var cowIcon = createCow();
var cowButton = createUIObjectButton([canvas.width / 2 + 50, canvas.height - 40], gameHudZ, [30, 30], cowIcon);
cowButton.handleClick = function (x, y, world) {
    if (world.focus != null) {
        world.focus.addCow(world);
    }
};
cowButton.hidden = true;
gameHudButtons.push(cowButton);

var w = 200;
var h = 100;

var starterWorld = {
    "size" : [w, h],
    "objects" : [],
    "uiObjects" : [],
    // pixels / m
    // Initial value is width of screen.
    "zoom" : canvas.width / w,
    "view" : [0, 0, w, h],
    // in m/s
    "g" : 9.8,
    "focus" : null,
    "focusWidthPixels" : null,
    "focusGoalWidthPixels" : null,
    "focusZoom_ms" : 0,
    "drawBoundingBoxes" : false,
    handleMouseMove : function(relativeX, relativeY) {
        // Convert to world space
        var x = relativeX / this.zoom + this.view[0];
        var y = relativeY / this.zoom + this.view[1];

        for (var i = 0; i < this.objects.length; i++) {
            if (this.objects[i].handleMouseMove) {
                this.objects[i].handleMouseMove(x, y);
            }
        }

        return;
    },
    handleClick: function(relativeX, relativeY) {
        // First see if we clicked on a ui element
        for (var i = 0; i < this.uiObjects.length; i++) {
            if (!this.uiObjects[i].hidden && "handleClick" in this.uiObjects[i]) {
                if (this.uiObjects[i].inBox(relativeX, relativeY)) {
                    this.uiObjects[i].handleClick(relativeX, relativeY, this);
                    return;
                }
            }
        }

        // Now check game objects
        var x = relativeX / this.zoom + this.view[0];
        var y = relativeY / this.zoom + this.view[1];
        for (var i = 0; i < this.objects.length; i++) {
            if ("handleClick" in this.objects[i]) {
                this.objects[i].handleClick(x, y, this);
            }
        }

        return;
    },
    handleKeyDown : function(e) {
        if(e.keyCode == 66) {
            // pushed b
            this.drawBoundingBoxes = true;
        } else {
            // Pass along to objects
            for (var i = 0; i < this.objects.length; i++) {
                if (this.objects[i].handleKeyDown) {
                    this.objects[i].handleKeyDown(e, this);
                }
            }
        }
        return;
    },
    handleKeyUp : function(e) {
        if(e.keyCode == 66) {
            // pushed b
            this.drawBoundingBoxes = false;
        } else {
            // Pass along to objects
            for (var i = 0; i < this.objects.length; i++) {
                if (this.objects[i].handleKeyUp) {
                    this.objects[i].handleKeyUp(e, this);
                }
            }
        }
        return;
    },
    "draw": function() {
        // console.log("drawing world");

        // Update viewport to keep focus item in center 1/2 of screen if possible
        if (this.focus) {
            // First, adjust zoom based on bottom of focus object, such that object width is 100 at bottom and 50 at top.

            var newZoom = Math.max(this.focusWidthPixels / this.focus.size[0], canvas.width / this.size[0]);
            if (newZoom != this.zoom) {
                // Zoom changed, do a symmetric change to current position
                var newWidth = canvas.width  / this.zoom;
                var newHeight = canvas.height / this.zoom;
                
                this.zoom = newZoom;
                this.view = [
                    this.view[0] + (this.view[2] - newWidth) / 2,
                    this.view[1] + (this.view[3] - newHeight) / 2,
                    newWidth, newHeight];
            }
    
            //  *
            //     (1 + (1-(this.size[1] - this.focus.pos[1] - this.focus.size[1]) / this.size[1]));
            // if (this.zoom < 1) {
            //     this.zoom = 1;
            // } else if (this.zoom > 5) {
            //     this.zoom = 5;
            // }

            // Now center view. Desired state is for view and focus to have same center:
            //   this.view[i] + this.view[i+2]/2 = focus.pos[i] + focus.size[i] / 2
            // or
            //   this.view[i] = focus.pos[i] + focus.size[i] / 2 - this.view[i+2]/2
            //
            // For stability, only correct if desired position is more than 1/4 of the screen away,
            // and then, only as much as is needed to be that far.
            for (var i = 0; i < 2; i++) {
                var desiredViewPos = this.focus.pos[i] + this.focus.size[i] / 2 - this.view[i+2] / 2;
                if (this.view[i] < desiredViewPos - this.view[i+2] / 4) {
                    this.view[i] = desiredViewPos - this.view[i+2] / 4;
                }
                if (this.view[i] > desiredViewPos + this.view[i+2] / 4) {
                    this.view[i] = desiredViewPos + this.view[i+2] / 4;
                }
                // Make sure view is legal
                if (this.view[i] < 0) {
                    this.view[i] = 0;
                }
                if (this.view[i] + this.view[i+2] > this.size[i]) {
                    this.view[i] = this.size[i] - this.view[i+2];
                }
            }
        } else {
            this.zoom = canvas.width / this.size[0];
            this.view[2] = canvas.height / this.zoom;
            this.view[3] = canvas.width  / this.zoom;
        }

        // Sort objects by z depth, highest first
        this.objects.sort(function(a, b) {
            if (!("z" in a)) {
                a.z = 0;
            }
            if (!("z" in b)) {
                b.z = 0;
            }
            return b.z - a.z;
        });

        for (var i = 0; i < this.objects.length; i++) {
            var o = this.objects[i];
            if (!("draw" in o)) {
                // Non-drawable object
                continue;
            }
            if ("hidden" in o && o.hidden) {
                continue;
            }
            if ("alpha" in o) {
                if (o.alpha <= 0) {
                    // invisible, don't draw
                    continue;
                } else {
                    ctx.globalAlpha = o.alpha;
                }
            } else {
                ctx.globalAlpha = 1;
            }
            if ('size' in o) {
                var visible =
                    (o.pos[0] + o.size[0] > this.view[0]) &&
                    (o.pos[1] + o.size[1] > this.view[1]) &&
                    (o.pos[0] < this.view[0] + this.view[2]) &&
                    (o.pos[1] < this.view[1] + this.view[3]);
                if (visible) {
                    var zoom = this.zoom;
                    var box = [zoom * (o.pos[0] - this.view[0]),
                               zoom * (o.pos[1] - this.view[1]),
                               zoom * o.size[0],
                               zoom * o.size[1]];
                    if (o.draw && !o.hidden) {
                        o.draw(box);
                    }
                    if (this.drawBoundingBoxes && 'pos' in o && 'size' in o) {
                        ctx.strokeStyle = "green";
                        ctx.strokeRect(box[0], box[1], box[2], box[3]);
                    }
                }
            } else {
                // dimensionless object to draw
                o.draw([0, 0, canvas.width, canvas.height]);
            }
        }

        // Draw UI elements over the rest of the screen
        for (var i = 0; i < this.uiObjects.length; i++) {
            if (!this.uiObjects[i].hidden) {
                this.uiObjects[i].draw();
            }
        }

        return;
    },
    "update" : function(delta_ms) {

        // Animate zoom on focus
        if (this.focusZoom_ms > 0) {
            if (delta_ms >= this.focusZoom_ms) {
                this.focusWidthPixels = this.focusGoalWidthPixels;
                this.focusZoom_ms = 0;
            } else {
                this.focusWidthPixels = this.focusWidthPixels + (this.focusGoalWidthPixels - this.focusWidthPixels) * delta_ms / this.focusZoom_ms;
                this.focusZoom_ms = this.focusZoom_ms - delta_ms;
            }
        } 

        // Update all objects
        for (var i = 0; i < this.objects.length; i++) {
            if ('update' in this.objects[i]) {
                this.objects[i].update(delta_ms, this);
            }
        }

        // Handle game over
        if (this.focus) {
            if (this.focus.health <= 0) {
                this.endGame();
            }
        }

        return;
    },
    "getObjectsInBox" : function (box) {
        var result = [];
        OBJECT:
        for (var i = 0; i < this.objects.length; i++) {
            var o = this.objects[i];
            if (!("pos" in o) || !("size" in o)) {
                continue OBJECT;
            }
            for (var dim = 0; dim < 2; dim++) {
                if (o.pos[dim] + o.size[dim] < box[dim]) {
                    continue OBJECT;
                } else if (o.pos[dim] > box[dim] + box[dim+2]) {
                    continue OBJECT;
                }
            }
            // Not outside of box
            result.push(o);
        }
        return result;
    },
    "removeObject" : function (o) {
        var i = 0;
        while (i < this.objects.length) {
            if (this.objects[i] === o) {
                this.objects.splice(i, 1);
            } else {
                i++;
            }
        }
        return;
    },
    "addObjectOnGround" : function(o) {
        o.pos = [Math.random() * (this.size[0] - o.size[0]), 0.9 * this.size[1] - o.size[1] - 0.1];
        this.objects.push(o);
    },
    initializeWorld: function() {
        // Reset objects
        this.objects = [];

        // Add bounding box around world to keep physics objects in.
        this.objects.push(createInvisibleBoundingBox([-1,            -1], [this.size[0] + 2, 2], 1));
        this.objects.push(createInvisibleBoundingBox([-1, this.size[0]], [this.size[0] + 2, 2], 1));
        this.objects.push(createInvisibleBoundingBox([-1,            -1], [2, this.size[1] + 2], 1));
        this.objects.push(createInvisibleBoundingBox([this.size[0], -1], [2, this.size[1] + 2], 1));
        
        this.objects.push(createStarField(0, 0, this.size[0], this.size[1], this.size[0] * this.size[1] / 100));
        
        // Bottom 10% of world is ground
        this.objects.push(createGroundBackground(0, this.size[1] - 0.1 * this.size[1], this.size[0], 0.1 * this.size[1]));
        
        // Bottom 5% is collision box for ground. Ground is moderately bouncy
        this.objects.push(createInvisibleBoundingBox([0, 0.95 * this.size[1]], [this.size[0], 0.05 * this.size[1]], .75));

        //
        // Decorative foreground stuff
        //
    
        var fenceSegments = Math.floor(this.size[0] / 2);
        for (var i = 0; i < fenceSegments; i++) {
            if (Math.random() > 0.1) {
                this.objects.push(createFence(2 * i, 0.95 * this.size[1] - 0.25, 2, 1));
            }
        }
        
        var numSilos = Math.floor(this.size[0] / 40);
        for (var i = 0; i < numSilos; i++) {
            var width  = 5;
            var height = 10;
            this.objects.push(createSilo(Math.random() * this.size[0] - width / 2,
                                          10 + Math.random() * 100,
                                          width, height, this));
        }

        {
            var width  = 15;
            var height = 12;
            var depth  = 10;
            this.objects.push(...createBarn(
                Math.random() * this.size[0] - width / 2, 0.95 * this.size[1] - height, 5,
                width, height, depth));
        }
        
        // Atmosphere covers entire screen.
        this.objects.push(createAtmosphere(0, 0, this.size[0], this.size[1]));
    
        return;
    },
    gameHudButtons : [],
    startGame : function() {

        
        // Create cows
        for (var i = 0; i < 10; i++) {
            this.addObjectOnGround(createCow());
        }
        for (var i = 0; i < 5; i++) {
            this.addObjectOnGround(createHayBale());
        }
        this.objects.push(createCowGenerator());

        // Initial ship is 5m in center of world
        var ship = createShip(5, [this.size[0] / 2, this.size[1] / 2]);
        this.objects.push(ship);

        // Set world focus on ship and zoom to it over a second
        this.focus = ship;
        this.focusWidthPixels = canvas.width * this.focus.size[0] / this.size[0];
        this.focusGoalWidthPixels = 100;
        this.focusZoom_ms = 2000;
        
        for (var i = 0; i < this.gameHudButtons.length; i++) {
            this.gameHudButtons[i].hidden = false;
        }
        
        return;
    },
    endGame : function() {
        // hide HUD BUTTONS
        for (var i = 0; i < this.gameHudButtons.length; i++) {
            this.gameHudButtons[i].hidden = true;
        }
        
        // Start zooming out
        this.focusGoalWidthPixels = canvas.width * this.focus.size[0] / this.size[0];
        this.focusZoom_ms = 3000;

        return;
    }
};

starterWorld.initializeWorld();

starterWorld.gameHudButtons.push(...gameHudButtons);
starterWorld.uiObjects.push(...gameHudButtons);

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);
document.addEventListener("click", clickHandler, false);
var paused = false;

var last_now_ms = performance.now();

var overlayZ = -5;

var pauseButton = createUITextButton ([canvas.width - 40, 10], overlayZ, [30, 30], '⏸');
pauseButton.handleClick = function (x, y, world) {
    startPause();
};
pauseButton.hidden = true;
starterWorld.gameHudButtons.push(pauseButton);


var pauseScreen = createUIObject([0, 0], overlayZ, [canvas.width, canvas.height]);
pauseScreen.hidden = true;
pauseScreen.draw = function (x, y) {
    ctx.fillStyle = "#0009";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width/2, canvas.height/2);
    ctx.strokeStyle = "#AFA";
    ctx.textAlign = "center";
    ctx.strokeText("Paused", canvas.width/2, canvas.height/2);
};
pauseScreen.handleClick = function (x, y) {
    endPause();
    this.hidden = true;
};
starterWorld.uiObjects.push(pauseScreen);

// Start with all hud buttons hidden
starterWorld.uiObjects.push(...starterWorld.gameHudButtons);

var splashScreen = createUIObject([0, 0], overlayZ, [canvas.width, canvas.height]);
splashScreen.draw = function(view) {
    ctx.fillStyle = "#0009";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#AFA";
    ctx.textAlign = "center";
    ctx.fillText("Cow Abducting Simulator", canvas.width/2, canvas.height/2);
    ctx.strokeText("Cow Abducting Simulator", canvas.width/2, canvas.height/2);

    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Click to Start", canvas.width/2, canvas.height * .75);
    return;
};
splashScreen.handleClick = function(x, y, world) {
    this.hidden = true;

    world.startGame();
    return;
};
starterWorld.uiObjects.push(splashScreen);

function startPause () {
    paused = true;
    pauseScreen.hidden = false;
}
function endPause () {
    paused = false;
    pauseScreen.hidden = true;
    last_now_ms = performance.now();
}

var activeWorld = starterWorld;

function keyDownHandler(e) {
    // Suppress default for space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }

    if (!paused) {
        activeWorld.handleKeyDown(e);
    }
}
function keyUpHandler(e) {
    if (e.keyCode == 27) {
        if (paused) {
            endPause();
        } else {
            startPause();
        }
    } else {
        if (!paused) {
            activeWorld.handleKeyUp(e);
        }
    }
}
function mouseMoveHandler(e) {
    var relativeX = e.clientX - canvas.offsetLeft;
    var relativeY = e.clientY - canvas.offsetTop;

    activeWorld.handleMouseMove(relativeX, relativeY);
}
function clickHandler(e) {
    if (paused) {
        endPause();
    } else {
        var relativeX = e.clientX - canvas.offsetLeft;
        var relativeY = e.clientY - canvas.offsetTop;

        activeWorld.handleClick(relativeX, relativeY);
    }
}

function draw(now_ms) {
    if (!paused) {
        if (now_ms - last_now_ms > 1000) {
            // At lease a second passed. Probably tab was in background.
            startPause();
        } else {
            activeWorld.update(now_ms - last_now_ms);
            last_now_ms = now_ms;
        }
    }

    // Draw even if paused
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    activeWorld.draw();

    requestAnimationFrame(draw);
}

draw(performance.now());

// cspell:ignore regen
