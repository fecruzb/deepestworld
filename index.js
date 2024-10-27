const IS_ACTIVE = true;
const DRAWING = {
    grid: false,
    hitbox: true,
    treeSpot: true,
    visitedAreas: true,
    monsterVision: true,
    path: true,
    monsterScore: true,
}

dw.debug = true;
let lastPosition = { x: dw.character.x, y: dw.character.y };
let lastMoveTime = Date.now();
let bestTarget = null
const visitedPositions = []

let lastPath = null; // Stores the last computed path
let lastComputationTime = 0; // Stores the timestamp of the last path computation;
/**
 * Configuration constants used throughout the code.
 * @constant
 * @type {Object}
 * @property {number} visionConeAngle - The angle of the cone of vision in radians.
 * @property {number} visionConeRadius - The radius of the cone of vision.
 * @property {number} predictionTime - The number of seconds to predict future positions in the cone of vision.
 * @property {number} pathStepSize - The step size for the pathfinding algorithm.
 * @property {number} maxPathfindingIterations - The maximum number of iterations allowed in the pathfinding algorithm.
 * @property {number} interpolationSteps - The number of interpolation steps for linear interpolation.
 * @property {number} gooProximityRange - Radius to check the proximity of "goo" monsters.
 * @property {number} monsterProximityRange - Radius to check the proximity of other monsters.
 */
const SETTINGS = {
    gameLoopInterval: 400,
    globalProximityToAction: 0.5,
    globalSafePositioning: 0.2,
    pathProximity: 0.7,
    visionConeAngle: Math.PI, 
    visionConeRadius: 3.2, 
    pathStepSize: 0.75,
    maxPathfindingIterations: 500,
    interpolationSteps: 20,
    gooProximityRange: 1,
    monsterProximityRange: 1,
    zoneLevelSuicide: 53,
    idleTime: 30,
    needRecoveryHpTreshold: 0.8,
};

/**
 * Configuration flags for various behaviors
 */
const CONFIG = {
    plantTree: false,
    getResources: false,
    optimizePath: true,
    exploreNewAreas: true,
    removeItems: false,
    combineItems: false,
    recycleItems: false,
    sortItems: true,
    suicideAtZoneLevel: false,
    suicideUnderground: false,
    attackNextScoreMonster: true,
    moveToMission: false,
    moveToShrub: false,
    enableRecoveryDistance: true,
    followAllied: false,
};

const SKILLS = {
    attack: {
        enable: true,
        index: 0,
        range: 0.7,
    },
    exertion: {
        enable: true,
        index: 1,
        range: 0.7,
        hpThreshold: 24000,
    },
    conservation: {
        enable: false,
        index: 1,
        range: 0.7,
        hpThreshold: 1,
    },
    shield: {
        enable: true,
        index: 3,
        range: 0.5,
        withBomb: false
    },
    heal: {
        enable: true,
        index: 2,
        range: 0.5,
        hpThreshold: 1,
        hpThresholdMin: 0.4,
        withExertion: true,
        withMasochism: false,
        withGraft: true
    },
    heal_alternative: {
        enable: false,
        index: 2,
        range: 0.5,
        hpThreshold: 0.6,
        withMasochism: false
    },
    buff: {
        enable: true,
        index: 6,
        range: 0.75,
    },
    dash: {
        enable: true,
        index: 4,
        range: 2,
        minRange: 1.5
    },
    teleport: {
        enable: true,
        index: 5,
        range: 4.1,
        minRange: 0,
        minSavedRange: 0
    },
    graft: {
        enable: false,
        index: 3,
        range: 2.60
    },
    arrow: {
        enable: false,
        index: 9,
        range: 3
    },
    taunt: {
        enable: true,
        index: 5,
        range: 0.88
    },
    aoe: {
        enable: false,
        index: 9,
        range: 0.88
    },
}

const ITEMS = {
    global: {
        min_any_mod_quantity: 6,
        min_any_mod_quality: 12,
        mods_to_keep: [],
        tags_to_keep: [],
        mds_to_keep: []
    },
    weapon: {
        mods: [
            "physDmgIncLocal", 
            "physDmgLocal",
            "critLocal"
        ],
        conditions: {
            operator: "AND", 
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 6,
                },
                { 
                    condition: "min_sum_quality",
                    value: 8
                },
            ]
        }
    },
    accessory: {
        mods: ["dmg", "physDmg"],
        conditions: {
            operator: "AND",
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 5
                },
                { 
                    condition: "min_sum_quality", 
                    value: 8
                }
            ]
        }
    },
    belt: {
        mods: ["dmg", "physDmg"],
        conditions: {
            operator: "AND",
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 5
                },
                { 
                    condition: "min_sum_quality", 
                    value: 8
                },
            ]
        }
    },
    glove: {
        mods: ["hp", "physDmg"],
        conditions: {
            operator: "AND",
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 5
                },
                { 
                    condition: "min_sum_quality", 
                    value: 8
                }
            ]
        }
    },
    armor: {
        mods: ["hp", "mp"],
        conditions: {
            operator: "AND",
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 5
                },
                { 
                    condition: "min_sum_quality", 
                    value: 8
                }
            ]
        }
    },
    passive: {
        mods: [
                "hpInc", 
                "hpRegenInc", 
                "gcdr", 
                "crit", "critMult",
                "physDmg", "physDmgInc", "physDmgMore",
                "dmg", "dmgInc", "dmgMore",  
                "fireDmg", "fireDmgInc", "fireDmgMore"
        ], 
        conditions: {
            operator: "OR",
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 3
                },
            ]
        }
    },
    combine: ["wood",  "portalScroll", "essence", "dust"],
    remove: ["flax", "rawhide", "linenCloth"]
};

const SCORE = {
    monster: {
        /**
         * Base score for all monsters. 
         * Ensures that monsters have a starting priority over resources.
         */
        baseScore: 15,

        missionIdScore: 50,

        /**
         * Bonus if the monster is injured (current HP < max HP).
         * Prioritizes monsters that are easier to defeat due to lower HP.
         */
        injuredBonus: 50,

        /**
         * Large bonus if the monster is specifically targeting the player character.
         * Prioritizes immediate threats that are actively engaging the player.
         */
        targetCharacterBonus: 500,

        /**
         * Negative adjustment if the monster is marked as huntable.
         * Reduces priority for huntable monsters, which are less urgent to defeat.
         */
        canHunt: -100,

        /**
         * Multiplier for rare monsters based on their rarity level.
         * If the rarity or HP exceeds the thresholds, the monster is harder to defeat,
         * and should be deprioritized. Higher rarity increases the score unless too difficult.
         */
        rareMonsterMultiplier: 15,

        /**
         * Rarity level threshold. Monsters with rarity above this level are avoided,
         * as they are considered too strong to defeat.
         */
        rareMonsterLimit: 6,

        /**
         * HP threshold. Monsters with max HP above this level are avoided,
         * as they are considered too tough to handle, even if their rarity is low.
         */
        rareMonsterHpThreshold: +Infinity,

         /**
         * Global HP threshold
         */
        hpThreshold: +Infinity,
        hpThresholScore: -100,
    },

    resource: {
        /**
         * Base score for resources. Generally negative because resources are deprioritized 
         * compared to monsters, unless gathering resources is specifically required.
         */
        baseScore: 0
    },

    proximity: {
        /**
         * Negative adjustment for proximity to "goo" monsters.
         * This score is applied for EACH goo near the target. Attacking near goo is risky
         * because multiple goos can merge to form a much stronger goo monster.
         */
        goo: -10,

        /**
         * Negative adjustment for each nearby monster around the target.
         * This penalty is applied for EACH nearby monster, encouraging prioritization of
         * safer fights with fewer monsters in close proximity.
         */
        nearbyMonster: -30,

        /**
         * Distance-based multiplier that reduces the score based on the distance to the target.
         * Applied for both monsters and resources, with closer targets prioritized over distant ones.
         */
        distanceMultiplier: -1
    },

    levelDifference: {
        /**
         * Enable or disable score adjustments based on the difference in levels between the player and the monster.
         * When enabled, monsters with a level closer to the player's level receive higher priority.
         */
        enabled: false,

        /**
         * Bonus for monsters that are the same level as the player.
         * These monsters are considered the most balanced challenges and are prioritized.
         */
        sameLevelBonus: 20,

        /**
         * Adjustment factor applied for each level of difference between the player and the monster.
         * Larger level differences, whether higher or lower, decrease the score.
         */
        differenceFactor: 5
    },

    path: {
        /**
         * Negative adjustment if there are monsters along the path to the target.
         * This penalty is applied for EACH monster along the path, as these obstacles 
         * make it harder to reach the target without facing additional combat.
         */
        monstersAlongPath: -20
    }
};

const protectList = ["Fireling"];
const healList = [];

const DEBUG = {
    lastMessage: null,
    log(message) {
        if(!DEBUG.lastMessage || message !== DEBUG.lastMessage) {
            DEBUG.lastMessage = message
            dw.log(message)
        }
    }
}

/**
 * Utility functions for vector and position calculations.
 * @namespace
 */
const Util = {
    /**
     * Calculates the magnitude (length) of a vector.
     * @param {Object} vec - The vector with x and y components.
     * @returns {number} The magnitude of the vector.
     */
    magnitude(vec) {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    },

    /**
     * Calculates the dot product of two vectors.
     * @param {Object} v1 - The first vector.
     * @param {Object} v2 - The second vector.
     * @returns {number} The dot product of the two vectors.
     */
    dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    },

    /**
     * Calculates the angle between two vectors in radians.
     * @param {Object} v1 - The first vector.
     * @param {Object} v2 - The second vector.
     * @returns {number} The angle between the vectors in radians.
     */
    angleBetween(v1, v2) {
        const dot = this.dotProduct(v1, v2);
        const mag1 = this.magnitude(v1);
        const mag2 = this.magnitude(v2);
        return Math.acos(dot / (mag1 * mag2));
    },

    /**
     * Checks if a point is within the vision cone of an observer.
     * @param {Object} observer - The observer with position (x, y) and direction (dx, dy).
     * @param {Object} point - The target point with position (x, y).
     * @returns {boolean} True if the point is within the vision cone, false otherwise.
     */
    isPointInCone(observer, point, coneRadius = SETTINGS.visionConeRadius, coneAngle = SETTINGS.visionConeAngle  ) {
        const observerDir = { x: observer.dx, y: observer.dy };
        const toPoint = { x: point.x - observer.x, y: point.y - observer.y };
        const angleToPoint = this.angleBetween(observerDir, toPoint);
        const distToPoint = this.magnitude(toPoint);
        return angleToPoint <= coneAngle / 2 && distToPoint <= coneRadius;
    },

    /**
     * Linearly interpolates between two points.
     * @param {Object} p1 - The starting point (x, y).
     * @param {Object} p2 - The end point (x, y).
     * @param {number} t - Interpolation factor (0 to 1).
     * @returns {Object} The interpolated point.
     */
    lerp(p1, p2, t) {
        return { 
            x: p1.x + t * (p2.x - p1.x), 
            y: p1.y + t * (p2.y - p1.y) 
        };
    },

    /**
     * Predicts the future position of an observer after a certain time.
     * @param {Object} observer - The observer with current position (x, y), direction (dx, dy), and movement speed.
     * @param {number} time - The future time in seconds.
     * @returns {Object} The predicted future position.
     */
    getObserverPositionAtTime(observer, time) {
        const futureX = observer.x + observer.dx * (observer.moveSpeed || 0.3) * time;
        const futureY = observer.y + observer.dy * (observer.moveSpeed || 0.3) * time;
        return { ...observer, x: futureX, y: futureY };
    },

    /**
     * Checks if a line between two points is in the vision cone of an observer.
     * @param {Object} observer - The observer object.
     * @param {Object} startPos - The start point of the line.
     * @param {Object} endPos - The end point of the line.
     * @returns {boolean} True if the line is in the vision cone, false otherwise.
     */
    isLineInConeOfVision(observer, startPos, endPos) {
        if (this.isPointInCone(observer, startPos) || this.isPointInCone(observer, endPos)) {
            return true;
        }
        for (let i = 0; i <= SETTINGS.interpolationSteps; i++) {
            const lerpT = i / SETTINGS.interpolationSteps;
            const currentPos = this.lerp(startPos, endPos, lerpT);
            if (this.isPointInCone(observer, currentPos)) {
                return true;
            }
        }
        return false;
    },


    /**
     * Checks if a trajectory crosses the vision cone of a monster.
     * @param {Object} monster - The monster object.
     * @param {Object} startPos - The starting position.
     * @returns {boolean} True if the trajectory is in the monster's vision cone, false otherwise.
     */
    isTrajectoryInMonsterCone(monster, startPos) {
        if (this.isPointInCone(monster, startPos)) return true;
        const targetPos = { x: monster.x, y: monster.y };
        for (let i = 0; i <= SETTINGS.interpolationSteps; i++) {
            const t = i / SETTINGS.interpolationSteps;
            const currentPos = this.lerp(startPos, targetPos, t);
            if (this.isPointInCone(monster, currentPos)) return true;
        }
        return false;
    },
    
    isPathBlockedByItems(x, y) {

        const collisionEntities = dw.findEntities(e => dw.mdInfo[e.md]?.canCollide);

        // Check each collision entity to see if the point is inside its hitbox
        for (const entity of collisionEntities) {
            const hitbox = dw.getHitbox(entity.md);
            const entityPosition = { x: entity.x, y: entity.y };

            // Check if the given point (x, y) is inside the entity's hitbox
            if (Util.isPointInsideHitbox({ x, y, ...dw.getHitbox(dw.c.md) }, entityPosition, hitbox)) {
                return true; // The point is blocked by an entity
            }
        }

        return false; // No entities block the point
    },

    // Helper function to check if a point is inside a hitbox
    isPointInsideHitbox(point, entityPosition, hitbox) {
        // Calculate the left, right, top, and bottom edges of the entity's hitbox
        const hitboxLeft = entityPosition.x - hitbox.w / 2; // Left edge is center minus half the width
        const hitboxRight = entityPosition.x + hitbox.w / 2; // Right edge is center plus half the width
        const hitboxTop = entityPosition.y - hitbox.h; // Top edge is bottom minus the height of the hitbox
        const hitboxBottom = entityPosition.y; // Bottom edge is the entity position's y

        // If the point itself has width and height, treat it as a hitbox as well
        if (point.w && point.h) {
            // Calculate the edges of the point's hitbox
            const pointLeft = point.x - point.w / 2;
            const pointRight = point.x + point.w / 2;
            const pointTop = point.y - point.h;
            const pointBottom = point.y;

            // Check for hitbox overlap between the entity's hitbox and the point's hitbox
            return (
                hitboxLeft < pointRight &&
                hitboxRight > pointLeft &&
                hitboxTop < pointBottom &&
                hitboxBottom > pointTop
            );
        } else {
            // If no width or height is provided, treat the point as a single coordinate
            return (
                point.x >= hitboxLeft &&
                point.x <= hitboxRight &&
                point.y >= hitboxTop &&
                point.y <= hitboxBottom
            );
        }
    },
    
    /**
     * Checks if a specific point is blocked by terrain, items, or the character's hitbox.
     * @param {Object} point - The point position (x, y).
     * @param {Object} [characterHitbox] - Optional. The character's hitbox {w, h} if provided.
     * @returns {boolean} True if the point or hitbox is blocked, false otherwise.
     */
    isPointBlocked(point, characterHitbox = null) {
        const terrainSurface = dw.getTerrainAt(point.x, point.y, dw.c.z);
        const terrainUnderground = dw.getTerrainAt(point.x, point.y, dw.c.z -1);

        // Check if terrain is blocking
        if (terrainSurface !== 0 || terrainUnderground < 1) {
            return true;
        }

        // Check if any items block the path
        if (Util.isPathBlockedByItems(point.x, point.y)) {
            return true;
        }

        // If characterHitbox is provided, check if any part of the hitbox is blocked
        if (characterHitbox) {
            // We loop through the hitbox area to see if any part is blocked by terrain or items
            const hitboxLeft = point.x - characterHitbox.w / 2;
            const hitboxRight = point.x + characterHitbox.w / 2;
            const hitboxTop = point.y - characterHitbox.h;
            const hitboxBottom = point.y;

            for (let x = hitboxLeft; x < hitboxRight; x++) {
                for (let y = hitboxTop; y < hitboxBottom; y++) {
                    const surface = dw.getTerrainAt(x, y, dw.character.z);
                    const underground = dw.getTerrainAt(x, y, dw.character.z - 1);
                    
                    if (surface !== 0 || underground < 1) {
                        return true;
                    }
                }
            }
        }

        return false;
    },



    /**
     * Checks if there is any terrain blocking the path between two points.
     * @param {Object} target - The target position (x, y).
     * @param {Object} origin - The origin position (x, y), default is character's current position.
     * @returns {boolean} True if the path is blocked, false otherwise.
     */
    isPathBlocked(target, origin = dw.c) {
        for (let i = 0; i <= SETTINGS.interpolationSteps; i++) {
            const t = i / SETTINGS.interpolationSteps;
            const point = this.lerp(origin, target, t);

            // Use the isPointBlocked function to check if this point is blocked
            if (this.isPointBlocked(point, dw.getHitbox(dw.character.md))) {
                return true; // If any point along the path is blocked, the path is blocked
            }
        }
        return false; // Path is clear
    },

    /**
     * Determines if a direct line between two points is safe from monster detection.
     * @param {Object} target - The target point (x, y).
     * @param {Object} origin - The origin point (x, y).
     * @returns {boolean} True if the line between the points is safe, false otherwise.
     */
    isSafe(target) {
        for (const monster of Finder.getMonsters()) {
            // Skip monsters that are already targeting the character or aren't aggressive
            if (monster.targetId === dw.c.id || monster.bad <= 0) continue;

            const hitbox = dw.getHitbox(monster.md);
            const monsterPosition = { x: monster.x, y: monster.y };

            

            // Check if the character is already inside cone of view
            if (this.isPointInCone(monster, dw.c)) {
                true // The point is not safe
            }

            // Check if the target point is in the monster's cone of vision
            if (this.isPointInCone(monster, target)) {
                return false; // The point is not safe
            }
        }
        return true; // No monsters detect the target
    },


    /**
     * Determines if a direct line between two points is safe from monster detection.
     * @param {Object} target - The target point (x, y).
     * @param {Object} origin - The origin point (x, y).
     * @returns {boolean} True if the line between the points is safe, false otherwise.
     */
    isSafePath(target, origin) {
        for (const monster of Finder.getMonsters()) {
            // Skip monsters that are already targeting the character or aren't aggressive
            if (monster.targetId === dw.c.id || monster.bad <= 0) continue;

            const hitbox = dw.getHitbox(monster.md);
            const monsterPosition = { x: monster.x, y: monster.y };

            // Check if the character is inside the monster's hitbox
            if (this.isPointInsideHitbox({ x: dw.character.x, y: dw.character.y, ...dw.getHitbox(dw.c.md) }, monsterPosition, hitbox)) {
                continue; // Skip this monster because the character is inside its hitbox
            }

            //  // Check if the character is already inside cone of view
            // if (this.isLineInConeOfVision(monster, target, dw.c)) {
            //     continue; // The point is not safe
            // }

            // Check if the path between target and origin is in the monster's cone of vision
            if (this.isLineInConeOfVision(monster, target, origin)) {
                return false; // The path is not safe
            }
        }
        return true; // The path is safe from all monsters
    },


    /**
     * Calculates the distance from the current character position to the target.
     * @param {Object} target - The target position (x, y).
     * @returns {number} The distance to the target.
     */
    distanceToTarget(target) {
        return dw.distance(dw.character.x, dw.character.y, target.x, target.y);
    },

    /**
     * Checks the proximity of "goo" monsters around a given monster.
     * @param {Object} monster - The monster to check proximity for.
     * @returns {number} The number of goo monsters nearby.
     */
    checkGooProximity(monster) {
        let count = 0;
        if (!Array.from(dw.mdInfo[monster.md]?.tag || [] ).includes("goo")) {
            return count;
        }

        Finder.getMonsters().forEach(other => {
            if (
                other.id !== monster.id && 
                Array.from(dw.mdInfo[other.md]?.tag || [] ).includes("goo") && 
                dw.distance(monster.x, monster.y, other.x, other.y) <= SETTINGS.gooProximityRange) {
                count++;
            }
        });
        return count;
    },

    /**
     * Checks the proximity of other monsters around a given monster.
     * @param {Object} monster - The monster to check proximity for.
     * @returns {number} The number of monsters nearby.
     */
    checkMonsterNearby(monster) {
        let count = 0;
        Finder.getMonsters().forEach(other => {
            if (other.id !== monster.id && dw.distance(monster.x, monster.y, other.x, other.y) <= SETTINGS.monsterProximityRange) {
                count++;
            }
        });
        return count;
    },

    /**
     * Counts how many monsters along the path of the given monster are within other monsters' vision cones.
     * @param {Object} monster - The monster for which to count the observed monsters.
     * @returns {number} The number of monsters along the path in vision cones.
     */
    countMonstersAlongPath(monster) {
        let count = 0;
        const startPos = { x: dw.c.x, y: dw.c.y };
        const targetPos = { x: monster.x, y: monster.y };
        Finder.getMonsters().forEach(observer => {
            if (observer.id !== monster.id && observer.bad > 0 && observer.targetId !== dw.c.id) {
                if (this.isLineInConeOfVision(observer, startPos, targetPos)) count++;
            }
        });
        return count;
    },

    /**
     * Calculates the total distance of a given path.
     * @param {Array<Object>} path - An array of points (x, y) representing the path.
     * @returns {number} The total distance of the path.
     */
    calculateTotalDistance(path) {
        let totalDistance = 0;

        // Iterate over the path and calculate the distance between each consecutive point
        for (let i = 0; i < path.length - 1; i++) {
            const currentPoint = path[i];
            const nextPoint = path[i + 1];
            const distance = dw.distance(currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y);

            totalDistance += distance; // Add the distance to the total
        }

        return totalDistance;
    },

    /**
     * Calculates a safe position behind the target based on the direction it is moving.
     * @param {Object} target - The target object (with x, y, dx, dy properties).
     * @param {number} safeDistance - The distance to keep behind the target.
     * @returns {Object} The new position { x, y } behind the target, maintaining the safe distance.
     */
    calculateSafePosition(target, distance, isBehind = true) {
        const { x, y, dx = 0, dy = 0 } = target;

        // Ensure the direction vector (dx, dy) is valid
        const magnitude = Math.sqrt(dx * dx + dy * dy); // Calculate the magnitude of the vector

        // If magnitude is 0, the target is stationary, so return the current position
        if (magnitude === 0) {
            return { x, y };
        }

        // Normalize the direction vector
        const normDx = dx / magnitude;
        const normDy = dy / magnitude;

        // If isBehind is true, move in the opposite direction; otherwise, move in the same direction
        const multiplier = isBehind ? -1 : 1;

        // Calculate the new position by moving "distance" units relative to the target's movement
        const newX = x + normDx * distance * multiplier;
        const newY = y + normDy * distance * multiplier;

        return { x: newX, y: newY };
    },

      /**
 * Generates a safe path from the character's position to a target or a point within a certain distance, avoiding monsters.
 * If a distance is provided, it finds the closest safe point within that distance and ensures a clear line of sight to the target.
 * @param {Object} characterPos - The starting position (x, y).
 * @param {Object} targetPos - The target position (x, y, dx, dy) of the monster, including direction.
 * @param {number} [maxDistance] - Optional maximum distance to target. If provided, the function will find a safe point within this distance.
 * @returns {Array<Object>} The safe path as an array of positions (x, y).
 */
    generateSafePath(characterPos, targetPos, maxDistance = null) {

        let adjustedTargetPos = targetPos;

        if (targetPos.md && dw.mdInfo[targetPos.md].isMonster && targetPos.bad > 0) {
            const safePosition = Util.calculateSafePosition(targetPos, SETTINGS.globalProximityToAction);
            adjustedTargetPos = {
                ...targetPos,
                x: safePosition.x,
                y: safePosition.y,
            };
        }

        // Se a distância máxima for fornecida, verifica se estamos dentro dela
        if (maxDistance !== null) {
            const distanceToTarget = dw.distance(characterPos.x, characterPos.y, adjustedTargetPos.x, adjustedTargetPos.y);
            // Se já estamos dentro da distância permitida, retorna o caminho direto
            if (distanceToTarget <= maxDistance) {
                return [characterPos, characterPos];
            }
        }

        const openList = [];
        const closedList = [];
        const path = [];
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
        ];

        let iterations = 0;

        // Cria o nó inicial como um objeto simples
        const startNode = {
            pos: characterPos,
            g: 0,
            h: dw.distance(characterPos.x, characterPos.y, adjustedTargetPos.x, adjustedTargetPos.y),
            f: dw.distance(characterPos.x, characterPos.y, adjustedTargetPos.x, adjustedTargetPos.y),
            parent: null
        };
        openList.push(startNode);

        while (openList.length > 0) {
            iterations++;
            if (iterations > SETTINGS.maxPathfindingIterations) {
                console.log("Iteration limit reached. Aborting!");
                return path.reverse(); // Retorna o caminho gerado até agora
            }

            // Seleciona o nó com o menor custo total (f)
            let currentNode = openList.reduce((prev, node) => node.f < prev.f ? node : prev);

            // Se houver uma distância máxima, verifica se o nó atual está dentro dela
            if (maxDistance !== null) {
                const currentDistanceToTarget = dw.distance(currentNode.pos.x, currentNode.pos.y, adjustedTargetPos.x, adjustedTargetPos.y);

                // Verifica se o caminho até o alvo está bloqueado por itens
                const hasClearSight = !Util.isPathBlockedByItems(currentNode.pos.x, currentNode.pos.y, adjustedTargetPos.x, adjustedTargetPos.y);

                // Se o ponto está dentro da distância e o caminho está limpo, paramos a busca
                if (currentDistanceToTarget <= maxDistance && hasClearSight) {
                    let node = currentNode;
                    while (node) {
                        path.push(node.pos);
                        node = node.parent;
                    }
                    path.reverse(); // Retorna o caminho do início até o ponto mais próximo

                    return path;
                }
            } else {
                // Se não houver distância máxima, verifica se chegamos ao alvo diretamente
                if (dw.distance(currentNode.pos.x, currentNode.pos.y, adjustedTargetPos.x, adjustedTargetPos.y) <= SETTINGS.pathProximity) {
                    let node = currentNode;
                    while (node) {
                        path.push(node.pos);
                        node = node.parent;
                    }
                    path.reverse(); // Retorna o caminho do início até o destino

                    // Certifica-se de que o último ponto é exatamente o destino ajustado
                    if (path.length === 0 || (path[path.length - 1].x !== adjustedTargetPos.x || path[path.length - 1].y !== adjustedTargetPos.y)) {
                        path.push(adjustedTargetPos); // Adiciona o destino ajustado se não estiver no caminho
                    }

                    return path;
                }
            }

            // Remove o nó atual da lista aberta e o adiciona à lista fechada
            openList.splice(openList.indexOf(currentNode), 1);
            closedList.push(currentNode);

            // Ordena as direções com base na proximidade ao alvo
            const sortedDirections = directions.slice().sort((a, b) => {
                const distA = dw.distance(
                    currentNode.pos.x + a.x * SETTINGS.pathStepSize,
                    currentNode.pos.y + a.y * SETTINGS.pathStepSize,
                    adjustedTargetPos.x,
                    adjustedTargetPos.y
                );
                const distB = dw.distance(
                    currentNode.pos.x + b.x * SETTINGS.pathStepSize,
                    currentNode.pos.y + b.y * SETTINGS.pathStepSize,
                    adjustedTargetPos.x,
                    adjustedTargetPos.y
                );
                return distA - distB; // Ordena do mais próximo para o mais distante
            });

            // Explora os nós vizinhos
            for (const direction of sortedDirections) {
                const newPos = {
                    x: currentNode.pos.x + direction.x * SETTINGS.pathStepSize,
                    y: currentNode.pos.y + direction.y * SETTINGS.pathStepSize
                };

                if (Util.isPathBlocked(newPos, currentNode.pos)) {
                    continue;
                }

                // Verifica se o novo nó é seguro ou já foi explorado
                if (!Util.isSafe(newPos) || closedList.find(node => node.pos.x === newPos.x && node.pos.y === newPos.y)) {
                    continue;
                }

                const gScore = currentNode.g + SETTINGS.pathStepSize;
                let neighborNode = openList.find(node => node.pos.x === newPos.x && node.pos.y === newPos.y);

                // Se o vizinho não estiver na lista aberta ou o novo caminho for mais barato
                if (!neighborNode) {
                    const hScore = dw.distance(newPos.x, newPos.y, adjustedTargetPos.x, adjustedTargetPos.y);
                    neighborNode = {
                        pos: newPos,
                        g: gScore,
                        h: hScore,
                        f: gScore + hScore,
                        parent: currentNode
                    };
                    openList.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = gScore + neighborNode.h;
                    neighborNode.parent = currentNode;
                }
            }
        }

        console.log("No path found.");
        return path; // Retorna o caminho gerado até agora ou vazio se nenhum caminho foi encontrado
    },



    /**
     * Optimizes a given path by skipping over safe segments, minimizing the number of points in the path.
     * @param {Array<Object>} path - An array of points (x, y) representing the original path.
     * @returns {Array<Object>} The optimized path.
     */
    optimizePath(path) {
        // Array to hold the new optimized path
        const optimizedPath = [];
        
        let i = 0; // Start index of the path

        // Always add the starting point to the optimized path
        optimizedPath.push(path[i]);

        // Try to find safe jumps in the path
        while (i < path.length - 1) {
            let farthestSafePoint = i + 1;

            // Check if we can safely jump to a further point
            for (let j = i + 1; j < path.length; j++) {
                if (Util.isSafePath(path[i], path[j]) && !Util.isPathBlocked(path[i], path[j])) {
                    farthestSafePoint = j; // If it's safe, update the farthest safe point
                } else {
                    break; // Stop checking if a non-safe point is found
                }
            }

            // Move to the farthest safe point found
            i = farthestSafePoint;

            // Add the farthest safe point to the optimized path
            optimizedPath.push(path[i]);
        }

        return optimizedPath;
    }
};

/**
 * Character state check functions.
 * @namespace
 */
const Character = {
    /**
     * Checks if the character is currently being attacked by any monsters.
     * @returns {boolean} True if any monster has the character as a target, otherwise false.
     */
    isBeingAttacked() {
        return Finder.getEntities().some(entity => 
            entity.targetId === dw.character.id && dw.mdInfo[entity.md]?.isMonster
        );
    },

    /**
     * Checks if the character's HP is below a given percentage.
     * @param {number} percentage - The threshold percentage (e.g., 0.5 for 50%).
     * @returns {boolean} True if the character's HP is below the given percentage, otherwise false.
     */
    isHpBelowPercentage(percentage) {
        return (dw.character.hp / dw.character.maxHp) <= percentage;
    },

    /**
     * Checks if the character's HP is below a given percentage.
     * @param {number} percentage - The threshold percentage (e.g., 0.5 for 50%).
     * @returns {boolean} True if the character's HP is below the given percentage, otherwise false.
     */
    isHpAbovePercentage(percentage) {
        return (dw.character.hp / dw.character.maxHp) >= percentage;
    },

    /**
     * Checks if the character has the 'bomb' condition active.
     * @returns {boolean} True if the character has the bomb condition, otherwise false.
     */
    hasBomb() {
        return 'bomb' in dw.character.conditions;
    },

    /**
     * Checks if the character has the 'lifeshield' condition active.
     * @returns {boolean} True if the character has the lifeshield condition, otherwise false.
     */
    hasLifeshield() {
        return 'lifeshield' in dw.character.conditions;
    },

    /**
     * Checks if the character has the 'shieldRecovery' condition active.
     * @returns {boolean} True if the character has the shield recovery condition, otherwise false.
     */
    hasShieldRecovery() {
        return 'shieldRecovery' in dw.character.conditions;
    },

    /**
     * Checks if the character has the 'conservation' effect active.
     * @returns {boolean} True if the character has the conservation effect, otherwise false.
     */
    hasConservation() {
        return 'conservation' in dw.character.fx;
    },

    /**
     * Checks if the character has the 'conservation' effect active.
     * @returns {boolean} True if the character has the conservation effect, otherwise false.
     */
    hasBuff() {
        return 'buff' in dw.character.fx || 'surge' in dw.character.fx;
    },


    /**
     * Checks if the character has the 'masochism' effect active.
     * @returns {boolean} True if the character has the masochism effect, otherwise false.
     */
    hasMasochism() {
        return 'masochism' in dw.character.fx;
    },

    /**
     * Checks if the character has the 'graft' effect active.
     * @returns {boolean} True if the character has the graft effect, otherwise false.
     */
    hasGraft() {
        return 'graft' in dw.character.fx;
    },

    
    /**
     * Checks if the character has the 'graft' effect active.
     * @returns {boolean} True if the character has the graft effect, otherwise false.
     */
    hasExertion() {
        return 'exertion' in dw.character.fx;
    },

    /**
     * Checks if the character is currently casting a spell or performing an action.
     * @returns {boolean} True if the character is casting, otherwise false.
     */
    isCasting() {
        return !!dw.character.casting;
    }
};

/**
 * Finder utility for locating game entities.
 * @namespace
 */
const Finder = {
    /**
     * Retrieves all entities sorted by distance from the character.
     * @returns {Array<Object>} Sorted array of entities.
     */
    getEntities() {
        return dw.e.sort((a, b) => 
            dw.distance(dw.character.x, dw.character.y, a.x, a.y) - 
            dw.distance(dw.character.x, dw.character.y, b.x, b.y)
        );
    },

    /**
     * Retrieves all monster entities.
     * @returns {Array<Object>} Array of monster entities.
     */
    getValidTargets() {
        return Finder.getEntities().filter(
            entity => 
                (
                    dw.mdInfo[entity.md]?.isMonster || 
                    (CONFIG.getResources && dw.mdInfo[entity.md]?.isResource) ||
                    (entity.md === "recycler" && CONFIG.recycleItems)
                ) && 
                entity.z === dw.character.z &&
                (!entity.isSafe || entity.owner === 1) &&
                !dw.mdInfo[entity.md]?.canHunt
        );
    },

    /**
     * Retrieves all monster entities.
     * @returns {Array<Object>} Array of monster entities.
     */
    getAllMonsters() {
        return Finder.getEntities().filter(entity => dw.mdInfo[entity.md]?.isMonster);
    },

    /**
     * Retrieves monster entities that match an optional filter.
     * @param {Function|boolean} [filter=false] - Optional filter function to apply.
     * @returns {Array<Object>} Array of filtered monster entities.
     */
    getMonsters(filter = false) {
        return Finder.getEntities().filter(filter || (entity => dw.mdInfo[entity.md]?.isMonster));
    },

    /**
     * Retrieves monsters with scores, sorted by score, and filters out blocked ones.
     * @param {Function|boolean} [filter=false] - Optional filter function to apply.
     * @returns {Array<Object>|null} Array of monsters with scores, or null if none found.
     */
    getMonstersByScore() {
        const monsters = Finder.getValidTargets();
        if (!monsters || monsters.length === 0) return null;

        return monsters.map(monster => {
            let score = 0;
            
            if(CONFIG.recycleItems && dw.mdInfo[monster.md]?.isStation) {
                const inventory = Misc.mapInventory()
                if((inventory?.recycle?.length >= 1 || dw.c.recycler?.output.filter(e => e !== null)?.length >= 1))
                    score += 50
                else 
                    score -= 1000
            }
           
            // If the target is a monster
            if (dw.mdInfo[monster.md].isMonster) {


                if(dw.c.mission && monster.missionId === dw.c.mission.id) {
                    //score += SCORE.monster.missionIdScore
                }

                score += SCORE.monster.baseScore; // Apply base score for monsters
                if (monster.hp < monster.maxHp) {
                    score += SCORE.monster.injuredBonus; // Apply bonus if the monster is injured
                }
                score += Util.checkGooProximity(monster) * SCORE.proximity.goo; // Apply goo proximity adjustment
                score += Util.checkMonsterNearby(monster) * SCORE.proximity.nearbyMonster; // Apply adjustment for nearby monsters
                if ([dw.character.id].includes(monster.targetId)) {
                    score += SCORE.monster.targetCharacterBonus; // Apply bonus if the monster is targeting the character
                }
                score += (60 * Math.exp(-0.6 * Util.distanceToTarget(monster)));


                if (monster.maxHp >= SCORE.monster.hpThreshold) {
                    //score += SCORE.monster.hpThresholScore; 
                }

                // Apply rare monster score
                if (monster.r > 0) {
                    if (monster.r <= SCORE.monster.rareMonsterLimit && monster.maxHp <= SCORE.monster.rareMonsterHpThreshold) {
                       score += monster.r * SCORE.monster.rareMonsterMultiplier; // Positive multiplier for rare monsters
                    } else {
                        score -= monster.r * SCORE.monster.rareMonsterMultiplier; // Negative multiplier if not considered rare
                    }
                }

                // Apply adjustment for huntable monsters
                score += dw.mdInfo[monster.md].canHunt ? SCORE.monster.canHunt : 0;

                // Apply level difference score adjustment
                if (SCORE.levelDifference.enabled) {
                    const levelDifference = Math.abs(monster.lvl - dw.c.lvl)

                    if(levelDifference > 8) {
                        score -= levelDifference * SCORE.levelDifference.differenceFactor;
                    }
                    else {
                        score += levelDifference * SCORE.levelDifference.differenceFactor;
                    }
                }
            }

            // If the target is a resource
            if (dw.mdInfo[monster.md].isResource) {
                score += SCORE.resource.baseScore; // Apply base score for resources
                score += Array.from(dw.mdInfo[monster.md].tags || []).includes("wood") ? 15 : 15; // Apply base score for resources
                score += (15 * Math.exp(-0.8 * Util.distanceToTarget(monster)));
                score += Util.checkMonsterNearby(monster) * SCORE.proximity.nearbyMonster; // Apply adjustment for nearby monsters
            }

            return { monster, score };
        }).sort((a, b) => b.score - a.score); // Sort monsters by score in descending order
    },

    /**
     * Retrieves the next monster to attack based on score.
     * @returns {Object|null} The next monster to attack, or null if none found.
     */
    getNextMonster() {
        if (!CONFIG.attackNextScoreMonster) return null;
        const monsters = Finder.getMonstersByScore() || [];
        

        // iterate to find a monster with path
        // find first mosnter with path and return the monster and the path
        const target = monsters?.find(m => {

            if(m.monster.targetId === dw.c.id) {
                return true
            }

            if(m.score < 0) return false

            if(m.monster.md.includes("recycler")) {
                if(m.score < 0) return false
                // const inventory = Misc.mapInventory()
                // if(
                //     (
                //         inventory?.recycle?.length === 0 && 
                //         m?.monster?.output.filter(e => e !== null)?.length === 0) 
                //         || !CONFIG.recycleItems 
                //     ) {
                //     return false
                // }
                return true
            }

            
            const path = Movement.findPath(m.monster)
            if(path?.path?.length > 1) {
                m.path = path.path
                return true
            }
            else {
                return false
            }
        })


        if (target) {
            bestTarget = target
            return { 
                ...target?.monster,
                path: target.path,
                score: target.score, 
                toAttack: dw.mdInfo[target?.monster?.md]?.isMonster,
                toGather: dw.mdInfo[target?.monster?.md]?.isResource,
            };
        }
        
        bestTarget = null
        return null;
    },
};

/**
 * Actions for using skills and managing attacks.
 * @namespace
 */
const Action = {
    /**
     * Uses the shield skill if conditions are met (not casting, not being attacked, skill enabled, no lifeshield or shield recovery).
     */
    useShieldSkill() {
        if (
            !Character.isCasting() &&
            !Character.isBeingAttacked() &&
            SKILLS.shield.enable
        ) {
            const shouldUse = SKILLS.shield.withBomb 
                ? !Character.hasBomb()
                : !Character.hasLifeshield() && !Character.hasShieldRecovery()

            if(shouldUse) {
                if (dw.canUseSkill(SKILLS.shield.index, dw.character.id)) {
                    DEBUG.log(`Using <span style="color: hotpink">Lifeshield</span>`);
                    dw.useSkill(SKILLS.shield.index, dw.c.id);
                    return true
                }
            }
        }
    },

    /**
     * Uses the heal skill if conditions are met (not casting, not being attacked, skill enabled, HP below a threshold).
     */
    useHealSkill() {
        if (
            (SKILLS.heal.withMasochism ? !Character.hasMasochism() : true) && 
            (SKILLS.heal.withGraft ? !Character.hasGraft() : true) && 
            (SKILLS.heal.withExertion ? !Character.hasExertion() : true) && 
            !Character.isCasting() &&
            !Character.isBeingAttacked() &&
            SKILLS.heal.enable &&
            Character.isHpBelowPercentage(SKILLS.heal.hpThreshold) &&
            Character.isHpAbovePercentage(SKILLS.heal.hpThresholdMin)
        ) {
            if (dw.canUseSkill(SKILLS.heal.index, dw.character.id)) {
                DEBUG.log(`Using <span style="color: hotpink">Heal</span>. Life below <span style="color: pink">${SKILLS.heal.hpThreshold * 100}%</span>`);
                dw.useSkill(SKILLS.heal.index, dw.character.id);
                return true
            }
        }
    },

     /**
     * Uses the heal skill if conditions are met (not casting, not being attacked, skill enabled, HP below a threshold).
     */
    useBuff() {
        if (
            !Character.isCasting() &&
            !Character.isBeingAttacked() &&
            !Character.hasBuff() &&
            SKILLS.buff.enable
        ) {
            if (dw.canUseSkill(SKILLS.buff.index, dw.character.id)) {
                DEBUG.log(`Using <span style="color: hotpink">Buff</span>.`);
                dw.useSkill(SKILLS.buff.index, dw.character.id);
            }
        }
    },

    useTaunt(target) {
         if (
            SKILLS.taunt.enable
        ) {
            if (dw.canUseSkill(SKILLS.taunt.index, target.id)) {
                DEBUG.log(`Using <span style="color: hotpink">Taunt</span>.`);
                dw.useSkill(SKILLS.taunt.index, target.id);
            }
        }
    },

    /**
     * Uses the heal skill if conditions are met (not casting, not being attacked, skill enabled, HP below a threshold).
     */
    useHealAlternativeSkill() {
        if (
            (!Character.hasMasochism() && SKILLS.heal_alternative.withMasochism) &&
            !Character.isCasting() &&
            !Character.isBeingAttacked() &&
            SKILLS.heal_alternative.enable &&
            Character.isHpBelowPercentage(SKILLS.heal_alternative.hpThreshold)
        ) {
            if (dw.canUseSkill(SKILLS.heal_alternative.index, dw.character.id)) {
                DEBUG.log(`Using <span style="color: hotpink">Alt Heal</span>. Life below <span style="color: pink">${SKILLS.heal_alternative.hpThreshold * 100}%</span>`);
                dw.useSkill(SKILLS.heal_alternative.index, dw.character.id);
            }
        }
    },

    /**
     * Determines if an AOE skill should be used based on the number of monsters in range.
     * @param {number} x - X-coordinate of the center of the AOE.
     * @param {number} y - Y-coordinate of the center of the AOE.
     * @returns {boolean} True if more than one monster is in range, otherwise false.
     */
    shouldUseAoe(x, y) {
        return Finder.getMonsters().filter(monster => 
            dw.mdInfo[monster.md]?.isMonster && 
            dw.distance(x, y, monster.x, monster.y) < SKILLS.aoe.area).length > 1;
    },

    /**
     * Follows the target and attacks using either ranged or melee skills.
     * @param {Object} target - The target to attack.
     * @param {number} [skillRange=0.75] - The range at which to use melee skills.
     */
    followAndAttack(target, needRecovery = false) {
        dw.setTarget(target.id);
        const distToTarget = Util.distanceToTarget(target);


        // Use heal and shield before battle
        if(distToTarget < 1.5) {
            Action.useShieldSkill()
            Action.useHealSkill()
        }

        const range = SKILLS.arrow.enable ? SKILLS.arrow.range : SKILLS.attack.range

        if(!Character.isCasting()) {

        // Use melee attack or AOE if in range
        if (distToTarget <= range && !needRecovery) {
            let attackSkill = SKILLS.attack.index;
            let label = 'Attacking'



            if(SKILLS.arrow.enable) {
                attackSkill = SKILLS.arrow.index
                label = 'Distant Attacking'

            }
 
            // Use conservation skill if needed
            if (!Character.hasConservation() && SKILLS.conservation.enable && Character.isHpBelowPercentage(SKILLS.conservation.hpThreshold) && target.hp === target.maxHp) {
                label = 'Conservation Attacking'
                attackSkill = SKILLS.conservation.index;
            }

            if(SKILLS.exertion.enable && target.maxHp >= SKILLS.exertion.hpThreshold  ) {
                label = 'Exertion Attacking'
                attackSkill = SKILLS.exertion.index
            }

            // Use AOE skill if multiple enemies are in range
            if (
                SKILLS.aoe.enable &&
                Action.shouldUseAoe(target.x, target.y) && 
                dw.canUseSkill(SKILLS.aoe.index, target.id)
            ) {
                DEBUG.log(`<span style="color: tomato;">AOE ${label}</span> <span style="color: cyaN">${dw.mdInfo[target.md].name}</span>`);
                dw.useSkill(SKILLS.aoe.index, target.x, target.y);
            } else if (dw.canUseSkill(attackSkill, target.id)) {
                DEBUG.log(`<span style="color: tomato;">${label}</span> <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
                dw.useSkill(attackSkill, target.id);
            }
        } else {
            if(needRecovery) {
                DEBUG.log("Waiting full recovery but approaching.")
                // Move not so close to target
                Movement.moveCloserToTarget(target, SETTINGS.globalSafePositioning)
            }
            // Move closer to targer
            else {
                Movement.moveCloserToTarget(target)
            }
        }
        }
    },
};

/**
 * Movement-related functions for managing character positioning and idle state.
 * @namespace
 */
const Movement = {

    followAllied() {
        if(CONFIG.followAllied) {
            const allied = Finder.getEntities().find(e => protectList.includes(e.name))
            if(allied) {
                DEBUG.log(`<span style="color: lime">Following</span> <span style="color: cyan">${allied?.name}</span>`);
                dw.move(allied.x, allied.y)
                return true
            }
        }
    },

    tauntAttacking() {
        if(CONFIG.followAllied) {
            const entities = Finder.getEntities()
            const allied = entities.find(e => protectList.includes(e.name))
            console.log(allied)
            if(allied) {
                const monster = entities.find(e => 
                    e.targetId === allied.id || 
                    e.targetId == dw.c.id || 
                    allied.targetId === e.id
                )
                if(monster) {
                    DEBUG.log(`<span style="color: lime">Moving</span> to <span style="color: lime">Taunt</span>`);
                    dw.move(monster.x, monster.y)
                    Action.useTaunt(monster)
                    return true
                }
            }
            }
    },

    /**
     * Check the zone level and trigger suicide if necessary.
     */
    checkZoneLevel() {
        if(
            CONFIG.suicideAtZoneLevel &&
            dw.getZoneLevel(dw.character.x, dw.character.y, dw.character.z) <= SETTINGS.zoneLevelSuicide
        ) 
            dw.suicide();
    },

    /**
     * Check if the character is on the correct terrain, trigger suicide if not.
     */
    checkTerrain() {
        if(CONFIG.suicideUnderground && dw.character.z !== 0)
            dw.suicide();
    },

    /**
     * Checks if the character has been idle for 1 minute and commits suicide if true.
     */
    checkCharacterIdle() {
        const currentTime = Date.now();
        if (dw.distance(dw.character.x, dw.character.y, lastPosition.x, lastPosition.y) <= 1) {
            if(currentTime - lastMoveTime >= 1000 * SETTINGS.idleTime) {
                DEBUG.log("Character idle for 3 minute, committing suicide.");
                dw.suicide();
                lastMoveTime = currentTime;
            }
        } else {
            lastPosition = { x: dw.character.x, y: dw.character.y };
            lastMoveTime = currentTime;
        }
    },

    /**
     * Moves the character closer to the target using either a path or direct movement.
     * @param {Object} target - The target object (e.g., monster) to move toward.
     */
    moveCloserToTarget(target, safeDistance = 0) {
        let { x, y, dx, dy } = target

        
        if (target?.path) {
            DEBUG.log(`<span style="color: lime">Pathfinding</span> to <span style="color: cyan">${dw.mdInfo[target.md]?.name}</span>`);
            x = target.path[1].x
            y = target.path[1].y
            if(dw.mdInfo[target.md].isMonster) {
                Movement.getCloserPath(target.path);
            }
        } else {
            DEBUG.log(`<span style="color: lime">Moving</span> to <span style="color: cyan">${dw.mdInfo[target.md]?.name}</span>`);
            if(dw.mdInfo[target.md].isMonster) {
                Movement.getCloserMove(target);
            }
        }

        if(safeDistance !== 0) {
            DEBUG.log(`<span style="color: lime">Safe Positioning</span> to <span style="color: cyan">${dw.mdInfo[target.md]?.name}</span>`);
            const safePoint = Util.calculateSafePosition({ ...target, x, y}, safeDistance)
            x = safePoint.x
            y = safePoint.y

            if(Util.distanceToTarget({ x, y}) <= safeDistance) {
                dw.stop()
            }
            else {
                dw.move(x,y)
            }

        }
        else {
            dw.move(x, y);
        }

    },

    /**
     * Uses movement skills (Dash/Teleport) to get closer to the next point on a path.
     * @param {Array<Object>} path - Array of points representing the path.
     */
    getCloserPath(path) {
        const nextPosition = path[1];
        const distanceNext = dw.distance(nextPosition.x, nextPosition.y, dw.c.x, dw.c.y);

        if (SKILLS.dash.enable && distanceNext >= SKILLS.dash.minRange && distanceNext <= SKILLS.dash.range && path.length === 2 && dw.character.hp === dw.character.maxHp) {
            if (dw.canUseSkill(SKILLS.dash.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Dashing</span> to <span style="color: yellow">${Math.round(nextPosition.x)}</span>,<span style="color: yellow">${Math.round(nextPosition.y)}</span> (${Math.round(distanceNext)})`);
                dw.useSkill(SKILLS.dash.index, nextPosition.x, nextPosition.y);
            }
        }

        const lastPosition = path[path.length - 1];
        const distanceLast = dw.distance(lastPosition.x, lastPosition.y, dw.c.x, dw.c.y);
        const distanceTotal = Util.calculateTotalDistance(path);
        const distanceDiff = distanceTotal - distanceLast;

        if (SKILLS.teleport.enable && distanceLast >= SKILLS.teleport.minRange && distanceLast <= SKILLS.teleport.range && distanceDiff > SKILLS.teleport.minSavedRange && dw.character.hp === dw.character.maxHp) {
            if (dw.canUseSkill(SKILLS.teleport.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Teleporting</span> to <span style="color: yellow">${Math.round(lastPosition.x)}</span>,<span style="color: yellow">${Math.round(lastPosition.y)}</span> (${Math.round(distanceLast)})`);
                dw.useSkill(SKILLS.teleport.index, lastPosition.x, lastPosition.y);
                dw.stop();
            }
        }
    },

    /**
     * Uses movement skills (Dash/Teleport) to get closer to a target directly.
     * @param {Object} target - The target to approach (e.g., monster).
     */
    getCloserMove(target) {
        const distanceToTarget = dw.distance(target.x, target.y, dw.c.x, dw.c.y);

        if (SKILLS.dash.enable && distanceToTarget >= SKILLS.dash.minRange && distanceToTarget <= SKILLS.dash.range  && dw.character.hp === dw.character.maxHp) {
            if (dw.canUseSkill(SKILLS.dash.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Dashing</span> to <span style="color: yellow">${Math.round(target.x)}</span>,<span style="color: yellow">${Math.round(target.y)}</span> (${Math.round(distanceToTarget)})`);
                dw.useSkill(SKILLS.dash.index, target.x, target.y);
            }
        }

        if (SKILLS.teleport.enable && distanceToTarget >= SKILLS.teleport.minRange && distanceToTarget <= SKILLS.teleport.range  && dw.character.hp === dw.character.maxHp) {
            if (dw.canUseSkill(SKILLS.teleport.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Teleporting</span> to <span style="color: yellow">${Math.round(target.x)}</span>,<span style="color: yellow">${Math.round(target.y)}</span> (${Math.round(distanceToTarget)})`);
                dw.useSkill(SKILLS.teleport.index, target.x, target.y);
                dw.stop();
            }
        }
    },

    /**
     * Moves the character to a mission target.
     */
    moveMission() {
        if (CONFIG.moveToMission && dw.character.mission) {
            DEBUG.log("Moving to mission target.");
            dw.move(dw.character.mission.x, dw.character.mission.y);
        }
    },

    /**
     * Moves the character toward a shrub and enters if close enough.
     */
    moveShrub() {
        if (!CONFIG.moveToShrub) return;

        const shrubPos = { x: 31, y: 3 };
        if (Util.distanceToTarget(shrubPos) <= 30) {
            DEBUG.log("Moving to shrub");
            dw.move(shrubPos.x, shrubPos.y);
            if (Util.distanceToTarget(shrubPos) <= 4) {
                DEBUG.log("Entering magic shrub.");
                dw.enterMagicShrub(321);
            }
        }
    },

    /**
     * Moves the character to a resource and gathers it if within range.
     * @param {Object} resource - The resource to gather.
     */
    moveAndGather(resource) {
        const distance = Util.distanceToTarget(resource);

        if (distance <= 0.6) {
            DEBUG.log(`<span style="color: lime">Gathering</span> <span style="color: cyan">${dw.mdInfo[resource.md].name}</span>`);
            dw.gather(resource.id);
        } else {
            Movement.moveCloserToTarget(resource)
        }
    },

   /**
     * Handles pathfinding for safe movement towards monsters based on score.
     */
    findPath(target) {
        const maxDistance = dw.mdInfo[target.md]?.isMonster && SKILLS.arrow.enable ? SKILLS.arrow.range : null
        const bestPath = Util.generateSafePath(dw.c, target, maxDistance); // Generate the safest path to the target
        if (bestPath.length > 0) {
            return { path: CONFIG.optimizePath ? Util.optimizePath(bestPath) : bestPath, target }; // Optimize the path for better movement
        } else {
            return [];
        }
    },

    /**
     * Handles pathfinding for safe movement towards monsters based on score.
     */
    updatePathfinder() {
        const monsterFinder = Finder.getMonstersByScore() || [];
        if (monsterFinder.length > 0) {
            bestTarget = Movement.findPath(monsterFinder[0].monster); // Generate the safest path to the monster
        }
    },

    visitedPositions: [],


    decayRate: 0.01, // Define a taxa de decadência da pontuação a cada ciclo
    decayInterval: 3000, // Intervalo em milissegundos para a decadência (por exemplo, 1 minuto)


    initializeDecay() {
        setInterval(() => {
            console.log(1)
            Movement.applyScoreDecay();
        }, Movement.decayInterval);
    },

        /**
     * Aplica a decadência de pontuação às posições visitadas.
     * Reduz gradualmente a pontuação das áreas visitadas ao longo do tempo.
     */
    applyScoreDecay() {
        const currentTime = Date.now();

        Movement.visitedPositions = Movement.visitedPositions.map(pos => {
            // Calcular o tempo desde a última visita
            const timeSinceLastVisit = (currentTime - pos.lastVisited) / 1000; // Em segundos

            // Reduzir a pontuação com base na taxa de decadência e no tempo decorrido
            const newScore = Math.max(0, pos.score - Movement.decayRate * timeSinceLastVisit);

            return { ...pos, score: newScore };
        });

        // Remover posições com pontuação 0
        Movement.visitedPositions = Movement.visitedPositions.filter(pos => pos.score > 0);
    },

        /**
     * Adiciona ou atualiza uma posição no conjunto de posições visitadas com uma pontuação.
     * Se a posição for nova, será adicionada com pontuação inicial de 1.
     * Se a posição já existir, sua pontuação será incrementada.
     * @param {number} x - Coordenada X.
     * @param {number} y - Coordenada Y.
     */
    markPositionAsVisited(x, y) {
        const existingPos = Movement.visitedPositions.find(pos => Math.hypot(pos.x - x, pos.y - y) <= 0.5);
        if (existingPos) {
            existingPos.score++; // Incrementa a pontuação se a posição já foi visitada
            existingPos.lastVisited = Date.now(); // Atualiza o tempo da última visita
        } else {
            Movement.visitedPositions.push({ x, y, score: 1, lastVisited: Date.now() }); // Adiciona uma nova posição com pontuação 1 e o tempo atual
        }
    },

    /**
     * Retorna a pontuação de visitação de uma posição.
     * Se a posição existir, retorna sua pontuação; caso contrário, retorna 0 para não visitada.
     * @param {number} x - Coordenada X.
     * @param {number} y - Coordenada Y.
     * @returns {number} A pontuação de visitação (0 se não visitada).
     */
    getPositionVisitScore(x, y) {
        const pos = Movement.visitedPositions.find(pos => Math.hypot(pos.x - x, pos.y - y) <= 0.5);
        return pos ? pos.score : 0; // Retorna a pontuação se visitada, caso contrário, 0
    },

    /**
     * Remove pontos de visitedPositions que estão a mais de 30 unidades de distância da posição atual.
     */
    cleanupDistantVisitedPoints() {
        const currentPos = { x: dw.character.x, y: dw.character.y };
        Movement.visitedPositions = Movement.visitedPositions.filter(pos => {
            const distance = Math.hypot(pos.x - currentPos.x, pos.y - currentPos.y);
            return distance <= 30; // Mantém pontos dentro de 30 unidades
        });
    },

    /**
     * Explora novas áreas movendo-se para posições com a menor pontuação de visitação em um raio de 5 unidades.
     * Evita áreas recentemente visitadas e garante movimento para longe de áreas altamente visitadas.
     * @returns {Object|null} A próxima direção para se mover, ou null se nenhum movimento válido for encontrado.
     */
    exploreNewAreas() {
        if(!CONFIG.exploreNewAreas) {
            return;
        }

        const currentTime = Date.now();
        const timeSinceLastComputation = currentTime - lastComputationTime;

        const currentPos = { x: dw.character.x, y: dw.character.y };

        // Limpa pontos distantes antes de explorar novas áreas
        Movement.cleanupDistantVisitedPoints();

        // Marca a posição atual como visitada
        Movement.markPositionAsVisited(currentPos.x, currentPos.y);

        // If the path was computed within the last second, return the last path
        if (timeSinceLastComputation < 1000 && lastPath) {
            return lastPath;
        }

       

        const maxDistance = 5; // Distância máxima para mover (aumente para evitar pequenos passos)
        const directions = [
            { x: maxDistance, y: 0 }, { x: -maxDistance, y: 0 }, // Esquerda e direita
            { x: 0, y: maxDistance }, { x: 0, y: -maxDistance }, // Cima e baixo
            { x: maxDistance, y: maxDistance }, { x: -maxDistance, y: maxDistance }, // Diagonais
            { x: maxDistance, y: -maxDistance }, { x: -maxDistance, y: -maxDistance } // Diagonais
        ];

        // Ordena direções com base na pontuação de visitação e distância de aglomerados densos
        directions.sort((a, b) => {
            const scoreA = Movement.getPositionVisitScore(currentPos.x + a.x, currentPos.y + a.y);
            const scoreB = Movement.getPositionVisitScore(currentPos.x + b.x, currentPos.y + b.y);
            const distA = Math.hypot(currentPos.x + a.x, currentPos.y + a.y);
            const distB = Math.hypot(currentPos.x + b.x, currentPos.y + b.y);

            // Prioriza áreas com pontuações mais baixas (menos visitadas) e distâncias maiores
            if (scoreA !== scoreB) {
                return scoreA - scoreB; // Prioriza áreas com menos visitas
            }
            return distB - distA; // Prioriza áreas mais distantes da posição atual
        });

        // Tenta cada direção, movendo-se para posições menos visitadas
        for (const dir of directions) {
            const newPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };

            // Garante que a nova posição é segura e evita bolhas de alta visitação
            if (Util.isSafe(newPos) && !Util.isPathBlocked(newPos)) {
                DEBUG.log(`Explorando nova área em [${newPos.x}, ${newPos.y}]`);
                const path = Movement.findPath(newPos);

                if (path?.path?.length > 1) {

                      // Atualiza o último caminho e o tempo de cálculo
                lastPath = path;
                lastComputationTime = currentTime;

                    dw.move(path.path[1].x, path.path[1].y);
                }
                return path;
            }
        }

        // Se nenhum movimento válido for encontrado, recorre à lógica de seguir a parede
        DEBUG.log("Nenhum caminho válido encontrado. Tentando seguir parede.");
        Movement.followWall(currentPos);

        return null; // Nenhum movimento válido encontrado
    },
};

const Misc = {

    // Count how many mods from a list are present in the item's modKeys
    countModsFromList(item, modList) {
        const modKeys = Object.keys(item.mods || {});
        return modList.filter(mod => modKeys.includes(mod)).length;
    },

    // Check if any mod in the item has a value greater than or equal to the provided threshold
    hasModWithMinQuality(item, modList, minQuality) {
        const modKeys = Object.keys(item.mods || {});
        const modValues = Object.values(item.mods || {});
        return modValues.some((modValue, i) => modList.includes(modKeys[i]) && modValue >= minQuality);
    },

    // Calculate the sum of mod values from a list of mods
    sumModQualityFromList(item, modList) {
        const modKeys = Object.keys(item.mods || {});
        const modValues = Object.values(item.mods || {});
        return modValues.reduce((sum, modValue, i) => {
            return modList.includes(modKeys[i]) ? sum + modValue : sum;
        }, 0);
    },

    // Calculate the sum of mod values from a list of mods
    sumModQuality(item) {
        const modValues = Object.values(item.mods || {});
        return modValues.reduce((sum, modValue, i) => {
            return sum + modValue
        }, 0);
    },

    // Count the number of sockets in the item
    countSockets(item) {
        return item?.sockets?.length || 0;
    },

    // Check if item is a weapon
    isWeapon(item) {
        const metaData = dw.mdInfo[item.md];
        return metaData?.isWeapon || false;
    },

    // Check if item is armor
    isArmor(item) {
        const metaData = dw.mdInfo[item.md];
        return (metaData?.isArmor && !item?.md?.includes("belt") && !item?.md?.includes("gloves")) || false;
    },

    isGlove(item) {
        const metaData = dw.mdInfo[item.md];
        return (metaData?.isArmor && item?.md?.includes("gloves")) || false;
    },

     // Check if item is armor
    isBelt(item) {
        const metaData = dw.mdInfo[item.md];
        return (metaData?.isArmor && item?.md?.includes("belt")) || false;
    },

    // Check if item is an accessory
    isAccessory(item) {
        const metaData = dw.mdInfo[item.md];
        return metaData?.isAccessory || false;
    },
    

    // Check if item is a rune
    isRune(item) {
        const metaData = dw.mdInfo[item.md];
        return metaData?.isSkill && Array.from(metaData?.tags || []).includes("rune");
    },

    // Check if item is passive
    isBook(item) {
        const metaData = dw.mdInfo[item.md];
        return Array.from(metaData?.tags || []).includes("book");
    },

    // Condition functions to evaluate against the item
    conditions: {
        // Check if the item has at least a certain number of mods from the mod list
        min_quantity: (item, condition, mods) => {
            const modCount = Misc.countModsFromList(item, mods);
            return modCount >= condition.value;
        },

        // Check if the item has at least a certain number of mods from the mod list
        md_list: (item, condition) => {
            return condition.value.includes(item.md)
        },

        // Check if the item has at least one mod from the list with a value greater than or equal to the threshold
        min_quality: (item, condition, mods) => {
            const hasModWithQuality = Misc.hasModWithMinQuality(item, mods, condition.value);
            return hasModWithQuality;
        },

        // Check if the sum of the mod values from the list is greater than or equal to the threshold
        min_sum_quality: (item, condition, mods) => {
            const totalModQuality = Misc.sumModQualityFromList(item, mods);
            return totalModQuality >= condition.value;
        },

        // Check if the sum of the mod values from the list is greater than or equal to the threshold
        min_sum_quality_total: (item, condition) => {
            const totalModQuality = Misc.sumModQuality(item);
            return totalModQuality >= condition.value;
        },

        // Check if the item has at least a certain number of sockets
        min_socket: (item, condition) => {
            const socketCount = Misc.countSockets(item);
            return socketCount >= condition.value;
        }
    },

    // Helper function to evaluate conditions
    evaluateConditions(item, conditions, mods) {
        const operator = conditions.operator || "AND"; // Default to AND if not specified
        const conditionResults = conditions.conditions.map(filterCondition => {
            const conditionFunction = Misc.conditions[filterCondition.condition];
            if (conditionFunction) {
                return conditionFunction(item, filterCondition, mods);
            }
            return false; // Return false if the condition function is not found
        });

        if (operator === "AND") {
            return conditionResults.every(result => result); // Apply AND logic
        } else if (operator === "OR") {
            return conditionResults.some(result => result); // Apply OR logic
        }

        return false; // Default to false if the operator is not recognized
    },

    
    getRecycler() {
         const entity = dw.findEntities((e) =>
            e.md.includes("recycler") && 
            dw.distance(e, dw.c) < 4).shift()

        if(entity) {
            return { ...entity, ...dw.c.recycler}
        }

        return false


    },

    getRecyclerSpotToMove() {
        const recycler = Misc.getRecycler()
        if(!recycler) return false
        return {
            id: recycler.id,
            index: recycler.input.findIndex(e => e === null)
        }
    },

    getRecyclerSpotToExtract() {
        const recycler = Misc.getRecycler()
        if(!recycler) return false
        return {
            id: recycler.id,
            index: recycler.output.findIndex(e => e !== null)
        }
    },

    getBagSpotToExtract() {
        return {
            index: dw.c.bag.findIndex(e => e === null)
        }
    },

    recycleItem(index) {
        const spot = Misc.getRecyclerSpotToMove()
        if(spot) {
            if(spot.index != -1) {
                dw.log(`Recycling item ${index}`)
                dw.moveItem(dw.c.bag, index, dw.c.recycler.input, spot.index)
            }
            else {
                dw.log("Storage is full.")
            }
        }
    },

    recyclerCollect() {
       const recycler = Misc.getRecycler()
       if(recycler) {
        const spotRecycler = Misc.getRecyclerSpotToExtract()
        const spotBag = Misc.getBagSpotToExtract()
            if(spotRecycler && spotRecycler.index === -1) {
                return
            }

            if(spotBag.index === -1) {
                dw.log("Your inventory is full to collect from recycler.")
                return
            }

            dw.log(`Collecting item ${spotRecycler.index} to ${spotBag.index}`)
            dw.moveItem(dw.c.recycler.output, spotRecycler.index, dw.c.bag, spotBag.index)
       }
    },

    recyclerTurnOn() {
        const recycler = Misc.getRecycler()
        if(recycler && recycler.input.find(e => e !== null)) {
            dw.log("Turning on")
            dw.recycle()
        }
    },

     learnSkills() {
    const passives = dw.c.learnedPassives;
    const skills = dw.c.learnedSkills;
    const stats = dw.c.learnedStats;

    // Itera sobre cada item do inventário
    dw.character.inventory.forEach((item, index) => {
        if (!item) return; // Ignora itens inválidos

        if (Misc.isBook(item)) {
            const itemName = item.name || `Item ${index}`;

            // Verifica os mods do item, que agora é um objeto
            for (let modName in item.mods) {
                const modTier = item.mods[modName]; // O tier do mod
                let reason = '';
                let color = 'red'; // Cor padrão para mods excluídos


                console.log(modName, dw.itemModValue(item, modName))

                // Verifica se o mod pertence aos passives
                if (passives[modName]) {
                    if (modTier > passives[modName].tier) {
                        reason = `<span style="color: green;">${modTier}</span> > <span style="color: red;">${passives[modName].tier}</span>`;
                        color = 'green'; // Cor verde para mods melhores
                        DEBUG.log(`passive: ${modName}: ${modTier} | ${reason}`);
                    } else {
                        reason = `<span style="color: red;">${modTier}</span> <= <span style="color: green;">${passives[modName].tier}</span>`;
                    }

                }
                // Verifica se o mod pertence aos skills (habilidades)
                else if (skills[modName]) {
                    if (modTier > skills[modName].tier) {
                        reason = `<span style="color: green;">${modTier}</span> > <span style="color: red;">${skills[modName].tier}</span>`;
                        color = 'green'; // Cor verde para mods melhores
                        DEBUG.log(`${modName}: ${modTier} | ${reason}`);
                    } else {
                        reason = `skills: <span style="color: red;">${modTier}</span> <= <span style="color: green;">${skills[modName].tier}</span>`;
                    }

                }
                // Verifica se o mod pertence aos stats (estatísticas)
                else if (stats[modName]) {
                    console.log(stats[modName])
                                    console.log("mine:", modName, dw.itemModValue(stats[modName], modName))

                    if (modTier > stats[modName].tier) {
                        reason = `<span style="color: green;">${modTier}</span> > <span style="color: red;">${stats[modName].tier}</span>`;
                        color = 'green'; // Cor verde para mods melhores
                        DEBUG.log(`${modName}: ${modTier} | ${reason}`);
                    } else {
                        reason = `stats: <span style="color: red;">${modTier}</span> <= <span style="color: green;">${stats[modName].tier}</span>`;
                    }

                } else {
                    reason = `mod ${modName} is new!`;
                    DEBUG.log(`${modName}: ${modTier} | ${reason}`);

                }

            }
        }
    });
}
,

    mapInventory() {
        const itemsToCombine = [];
        const itemsToRecycle = [];
        const itemsToRemove = [];

        // Helper function to log evaluation results
        const logEvaluation = (item, result, message) => {};

        // Helper function to log exclusion with colored mods
        const logExclusion = (item, mods, reason) => {
            const itemName = dw.mdInfo[item.md]?.name || 'Unknown Item';
            const modCount = mods.length;
            let color = 'white'; // Default to white
            switch(modCount) {
                case 1: color = 'lightgreen'; break;
                case 2: color = 'green'; break;
                case 3: color = 'blue'; break;
                case 4: color = 'purple'; break;
                case 5: color = 'gold'; break; // Assuming unique item has 5 mods
            }

            // Format mods with their values in white
            const modDetails = mods.map(mod => `${mod}: ${item.mods[mod]}`).join(', ');

            // DEBUG.log(`<span style="color: ${color};">${itemName}</span> (${modDetails}) excluded because: ${reason}`);
        };

        // Loop through each item in the inventory
        dw.character.inventory.forEach((item, index) => {
            if (!item) return;

            const mods = Object.keys(item.mods || {});
            const tags = Array.from(dw.mdInfo[item.md]?.tags || []) || [];

            // Log item type and mod details

            // Check if any mod matches the global mods_to_keep list
            const hasGlobalKeepMod = mods.some(mod => ITEMS.global.mods_to_keep.includes(mod));
            if (hasGlobalKeepMod) {
                logEvaluation(item, true, `Item has global mod to keep`);
                return;
            }

            // Check if any tags matches the global tags_to_keep list
            const hasGlobalKeepTag = tags.some(tag => ITEMS.global.tags_to_keep.includes(tag));
            if (hasGlobalKeepTag) {
                logEvaluation(item, true, `Item has global tag to keep`);
                return;
            }

            // Check if any md matches the global mds_to_keep list
            const hasGlobalKeepMd = ITEMS.global.mds_to_keep.includes(item.md);
            if (hasGlobalKeepMd) {
                logEvaluation(item, true, `Item has global md to keep`);
                return;
            }

            // Check if any mod has a high quality based on global settings
            const highQualityMod = Object.values(item.mods || {}).some(modValue => modValue >= ITEMS.global.min_any_mod_quality);
            if (highQualityMod) {
                logEvaluation(item, true, `Global high mod quality check: mod quality >= ${ITEMS.global.min_any_mod_quality}`);
                return;
            }

            // Check if item has enough mods
            const quantityMod = mods.length >= ITEMS.global.min_any_mod_quantity;
            if (quantityMod) {
                logEvaluation(item, true, `Global high mod quantity check: mod quantity >= ${ITEMS.global.min_any_mod_quantity}`);
                return;
            }

            // Evaluate conditions for weapons
            if (Misc.isWeapon(item)) {
                const { conditions } = ITEMS.weapon;
                const result = Misc.evaluateConditions(item, conditions, ITEMS.weapon.mods);
                logEvaluation(item, result, 'Weapon conditions evaluated');
                if (result) return;
                logExclusion(item, mods, 'Weapon conditions failed');
                itemsToRecycle.push(index); // Mark for removal if conditions fail
            }

            // Evaluate conditions for belts
            else if (Misc.isBelt(item)) {
                const { conditions } = ITEMS.belt;
                const result = Misc.evaluateConditions(item, conditions, ITEMS.belt.mods);
                logEvaluation(item, result, 'Belt conditions evaluated');
                if (result) return;
                logExclusion(item, mods, 'Belt conditions failed');
                itemsToRecycle.push(index); // Mark for removal if conditions fail
            }

            // Evaluate conditions for belts
            else if (Misc.isGlove(item)) {
                const { conditions } = ITEMS.belt;
                const result = Misc.evaluateConditions(item, conditions, ITEMS.glove.mods);
                logEvaluation(item, result, 'Gloves conditions evaluated');
                if (result) return;
                logExclusion(item, mods, 'Gloves conditions failed');
                itemsToRecycle.push(index); // Mark for removal if conditions fail
            }

            // Evaluate conditions for armor
            else if (Misc.isArmor(item)) {
                const { conditions } = ITEMS.armor;
                const result = Misc.evaluateConditions(item, conditions, ITEMS.armor.mods);
                logEvaluation(item, result, 'Armor conditions evaluated');
                if (result) return;
                logExclusion(item, mods, 'Armor conditions failed');
                itemsToRecycle.push(index); // Mark for removal if conditions fail
            }

            // Evaluate conditions for accessories
            else if (Misc.isAccessory(item)) {
                const { conditions } = ITEMS.accessory;
                const result = Misc.evaluateConditions(item, conditions, ITEMS.accessory.mods);
                logEvaluation(item, result, 'Accessory conditions evaluated');
                if (result) return;
                logExclusion(item, mods, 'Accessory conditions failed');
                itemsToRecycle.push(index); // Mark for removal if conditions fail
            }

            // Evaluate conditions for passives
            else if (Misc.isBook(item)) {
                // const { conditions } = ITEMS.passive;
                // const result = Misc.evaluateConditions(item, conditions, ITEMS.passive.mods);
                // logEvaluation(item, result, 'Passive conditions evaluated');
                // if (result) return;
                // logExclusion(item, mods, 'Passive conditions failed');
                // itemsToRecycle.push(index); // Mark for removal if conditions fail
            }

            // Handle combinable resources
            else if (ITEMS.combine.includes(item.md)) {
                logEvaluation(item, true, 'Item marked for combining');
                itemsToCombine.push(index);
            }
            
            // Handle combinable resources
            if (ITEMS.remove.includes(item.md)) {
                logEvaluation(item, true, 'Item marked for removal');
                itemsToRemove.push(index);
            }
        });

        return {
            recycle: itemsToRecycle,
            combine: itemsToCombine,
            remove: itemsToRemove
        }
    },

    /**
     * Cleans the inventory by removing unwanted items, combining resources, and sorting the inventory.
     * Items are classified by mod quality, mod count, and specific mod criteria.
     */
   cleanInventory() {
    let inventory = Misc.mapInventory();

     if (CONFIG.removeItems && inventory.remove.length > 0) {
        inventory.remove.forEach(inventoryIndex => dw.deleteItem(dw.c.bag, inventoryIndex));
        return;
    }

    inventory = Misc.mapInventory();

     if (CONFIG.combineItems && inventory.combine.length > 0) {
        dw.combineItems(inventory.combine);
    }   

    inventory = Misc.mapInventory();

    if (CONFIG.recycleItems && inventory.recycle.length > 0) {
        inventory.recycle.forEach(inventoryIndex => {
            Misc.recycleItem(inventoryIndex);
        });

        Misc.recyclerTurnOn();
    }

    Misc.recyclerCollect();

    inventory = Misc.mapInventory();

    if (CONFIG.sortItems && inventory.recycle.length === 0) {
        dw.sortInventory();
    }
    },

    // Função para calcular os pontos de plantio dentro de um plot
 calculateTreePlantingPoints(plot) {
    const treeSpacingX = 1; // Espaçamento entre as árvores
    const treeSpacingY = 0.5; // Espaçamento entre as árvores
    const startOffset = 0.25; // Ponto inicial dentro do plot
    let treePoints = [];

    // Percorrer o plot e calcular os pontos de plantio
    for (let x = startOffset; x < plot.w; x += treeSpacingX) {
        for (let y = startOffset; y < plot.h; y += treeSpacingY) {
            treePoints.push({ x: plot.x + x, y: plot.y + y });
        }
    }

    return treePoints;
},

// Função para verificar se o ponto colide com alguma entidade existente
 isPointCollidingWithEntities(point, entities, treeHitbox) {
    for (const e of entities) {
        const hitbox = dw.getHitbox(e.md); // Obtem a hitbox da entidade

        if (hitbox) {
            const entityX = e.x;
            const entityY = e.y;

            const hitboxWidth = hitbox.w;
            const hitboxHeight = hitbox.h;

            // Calcular os limites da hitbox
            const left = entityX - hitboxWidth / 2;
            const right = entityX + hitboxWidth / 2;
            const top = entityY - hitboxHeight;
            const bottom = entityY;

            // Verificar se o ponto (com o hitbox da nova árvore) colide com a hitbox da entidade
            const treeLeft = point.x - treeHitbox.w / 2;
            const treeRight = point.x + treeHitbox.w / 2;
            const treeTop = point.y - treeHitbox.h;
            const treeBottom = point.y;

            if (
                treeRight > left &&
                treeLeft < right &&
                treeBottom > top &&
                treeTop < bottom
            ) {
                return true; // Colisão detectada
            }
        }
    }

    return false; // Sem colisão
},

// Função para calcular todos os pontos de plantio válidos para todos os plots
 getAllTreePlantingPoints() {
    let allTreePoints = [];

    // Definir o hitbox da árvore que será plantada (ajustável)
    const treeHitbox = { w: 0.5, h: 0.5 }; // Por exemplo, 0.5x0.5 unidades
    // Iterar sobre todos os plots e calcular os pontos de cada um
    for (const plot of dw.account.plots) {
        const plotTreePoints = Misc.calculateTreePlantingPoints(plot);

        // Filtrar apenas os pontos que não colidem com entidades e hitboxes existentes
        const validPoints = plotTreePoints.filter(point => !Misc.isPointCollidingWithEntities(point, dw.entities, treeHitbox));

        allTreePoints.push(...validPoints); // Adiciona os pontos válidos ao array principal
    }

    return allTreePoints;
},

    plantTree() {
        if(CONFIG.plantTree) {

            const points = Misc.getAllTreePlantingPoints();

            const index = dw.c.inventory.findIndex(e => e?.md === "physmaple1"); 
        

            if (points.length === 0) {
                return;
            }

            if (index === -1) {
                return;
            }

            const nextPoint = points[0]; // Pega o próximo ponto para plantar a árvore
            const currentX = dw.c.x; // Posição atual do personagem
            const currentY = dw.c.y;

            const distanceToNextPoint = dw.distance(currentX, currentY, nextPoint.x, nextPoint.y); 
            if (distanceToNextPoint > 2) {
                dw.move(nextPoint.x, nextPoint.y); // Mover o personagem até o ponto
            } else {
                dw.placeStation(index, nextPoint.x, nextPoint.y)
            }
        }
    }
};


/**
 * Event handling and game loop
 */
const eventPriority = [
    Misc.plantTree,
    Movement.checkCharacterIdle,
    Movement.checkTerrain,
    Movement.checkZoneLevel,
    Misc.cleanInventory,
    Action.useBuff,
    Movement.tauntAttacking,
    Movement.followAllied,
    Finder.getNextMonster,
    Movement.moveShrub,
    Movement.moveMission,
    Movement.exploreNewAreas
];

/**
 * Handles game events based on event priority and acts accordingly.
 */
function handleGameEvents() {
    for (let eventFunction of eventPriority) {
        const target = eventFunction();
        if (!target) continue;

        const attackers = Finder.getEntities().filter(e => e.targetId === dw.character.id && dw.mdInfo[e.md]?.isMonster);
        const needRecovery = CONFIG.enableRecoveryDistance && 
                                        target.toAttack && 
                                        attackers.length === 0 && 
                                        (Character.isHpBelowPercentage(SETTINGS.needRecoveryHpTreshold))   




        // Handle attack actions
        if (target.toAttack) {
            Action.followAndAttack(target, needRecovery);
        }
        // Handle gathering actions
        else if (target.toGather) {
            Movement.moveAndGather(target);
        }
        else if (dw.mdInfo[target.md]?.isStation) {            
            Movement.moveCloserToTarget(target, 1)
        }
        return; // Stop processing further events after acting on the current one
    }

    // TO-DO implement pathfind seeking for a higher-level zone

    DEBUG.log("No relevant actions. Character standing by.");
}

/**
 * Main game loop that continuously checks for events to handle.
 */
function gameLoop() {
    try {
        if (IS_ACTIVE) {
            handleGameEvents();
        }
        setTimeout(gameLoop, SETTINGS.gameLoopInterval); // Re-run the loop every 250ms
    } catch (error) {
        throw error
    }
}

gameLoop();
Movement.initializeDecay();


dw.on("drawOver", ctx => {
    if (!DRAWING.grid) return false;

    ctx.lineWidth = 0.5;
    const gridSpacing = [0.125, 0.25, 0.5, 1]; // Different grid spacings
    const gridColors = ['#0000FF45', '#00FF0045', '#FF000045', '#FF000045']; // Colors for each grid level

    const characterX = dw.c.x;
    const characterY = dw.c.y;

    const gridRadius = 10; // Define the grid radius around the character

    // Function to align grids properly
    function alignGridPosition(value, spacing) {
        return Math.floor(value / spacing) * spacing;
    }

    // Function to check if a point is blocked
    function isPointBlocked(point) {
        const terrainSurface = dw.getTerrainAt(point.x, point.y, dw.c.z);
        const terrainUnderground = dw.getTerrainAt(point.x, point.y, dw.c.z - 1);

        // Check if terrain is blocking or if any items block the path
        return terrainSurface !== 0 || terrainUnderground < 1;
    }

    // Loop through each grid level
    gridSpacing.forEach((spacing, index) => {
        const color = gridColors[index];
        ctx.strokeStyle = color;

        // Adjust the loop range to ensure coverage across the entire grid
        const startX = alignGridPosition(characterX - gridRadius, spacing);
        const endX = alignGridPosition(characterX + gridRadius, spacing);
        const startY = alignGridPosition(characterY - gridRadius, spacing);
        const endY = alignGridPosition(characterY + gridRadius, spacing);

        // Loop through each point in the grid
        for (let x = startX; x <= endX; x += spacing) {
            for (let y = startY; y <= endY; y += spacing) {
                const gridX = dw.toCanvasX(x);
                const gridY = dw.toCanvasY(y);

                ctx.beginPath();
                ctx.rect(
                    gridX, 
                    gridY, 
                    spacing * dw.constants.PX_PER_UNIT_ZOOMED, 
                    spacing * dw.constants.PX_PER_UNIT_ZOOMED
                );
                
                // If it's the smallest grid, check if the point is blocked
                if (index === 0) {
                    const centerX = x + spacing / 2; // Calculate the center point of the grid cell
                    const centerY = y + spacing / 2;

                    // Use the isPointBlocked function to check if this point is blocked
                    if (isPointBlocked({ x: centerX, y: centerY })) {
                        // Fill the rectangle with a semi-transparent red if the point is blocked
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                        ctx.fillRect(
                            gridX, 
                            gridY, 
                            spacing * dw.constants.PX_PER_UNIT_ZOOMED, 
                            spacing * dw.constants.PX_PER_UNIT_ZOOMED
                        );
                    }
                }

                ctx.stroke(); // Draw the grid cell outline
            }
        }
    });
});




dw.on("drawOver", ctx => {
    if(!DRAWING.hitbox) return false;

    // Drawing hitboxes of entities
    for (const e of dw.e) {
        const hitbox = dw.getHitbox(e.md);
        if (hitbox) {
            const entityX = dw.toCanvasX(e.x);
            const entityY = dw.toCanvasY(e.y);

            const hitboxWidth = hitbox.w * dw.constants.PX_PER_UNIT_ZOOMED;
            const hitboxHeight = hitbox.h * dw.constants.PX_PER_UNIT_ZOOMED;

            const topLeftX = entityX - (hitboxWidth / 2);
            const topLeftY = entityY - hitboxHeight;


            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(topLeftX, topLeftY, hitboxWidth, hitboxHeight);

            if(dw.mdInfo[e.md]?.canCollide) {
                ctx.strokeStyle = 'red';
                ctx.fillStyle = '#ff000050';
                ctx.fill();
                ctx.stroke();
            }
            else {
                ctx.strokeStyle = 'lightgreen';
                ctx.fillStyle = '#00ff0050';
                ctx.fill();
                ctx.stroke();
            }
        }
    }
});




dw.on("drawUnder", (ctx) => {
    if (!DRAWING.visitedAreas) return false;

    // Desenhar áreas visitadas como bolhas
    Movement.visitedPositions.forEach(pos => {
        const canvasX = dw.toCanvasX(pos.x);
        const canvasY = dw.toCanvasY(pos.y);

        let alpha = Math.min(pos.score / 10, 1); // Limitar o alpha em 1 para áreas altamente visitadas
        ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 6})`; // Cor verde com transparência variável

        const radius = dw.constants.PX_PER_UNIT_ZOOMED * 0.5; // Raio da bolha para cada área visitada

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar seta do personagem até o ponto final de lastPath
    if (lastPath && lastPath.path && lastPath.path.length > 1) {
        console.log("draw")
        const startX = dw.toCanvasX(dw.character.x); // Posição atual do personagem no canvas
        const startY = dw.toCanvasY(dw.character.y);

        const endX = dw.toCanvasX(lastPath.path[lastPath.path.length - 1].x); // Ponto final do caminho
        const endY = dw.toCanvasY(lastPath.path[lastPath.path.length - 1].y);

        // Desenhar uma linha do personagem até o ponto final
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)"; // Cor da seta (vermelha com transparência)
        ctx.lineWidth = 3; // Largura da linha

        ctx.beginPath();
        ctx.moveTo(startX, startY); // Posição inicial (personagem)
        ctx.lineTo(endX, endY); // Posição final (ponto final do caminho)
        ctx.stroke();

        // Desenhar a ponta da seta no ponto final
        const arrowSize = 10; // Tamanho da ponta da seta
        const angle = Math.atan2(endY - startY, endX - startX); // Ângulo da linha

        // Calcular as coordenadas da ponta da seta (triângulo)
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.lineTo(endX, endY);
        ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; // Mesma cor da linha para a ponta da seta
        ctx.fill();
    }
});


dw.on("drawUnder", (ctx) => {
    if(!DRAWING.monsterVision) return false;

    // Drawing monsters and their vision cones
    const monsterFinder = Finder.getMonstersByScore(e => dw.mdInfo[e.md]?.isMonster) || [];

    const characterX = dw.toCanvasX(dw.c.x);
    const characterY = dw.toCanvasY(dw.c.y);

    monsterFinder.forEach(({ monster, score }, index) => {
        const monsterX = dw.toCanvasX(monster.x);
        const monsterY = dw.toCanvasY(monster.y);
        let circleColor = '#edff00'; // Default yellow
        let radius = dw.constants.PX_PER_UNIT_ZOOMED * 0.5;

        if (index === 0 && score >= 0) {
            circleColor = '#00ff00'; // Green for highest score
        } else if (score < 0) {
            circleColor = '#ff0000'; // Red for negative scores
        }

        ctx.strokeStyle = `${circleColor}80`; // Slight transparency for filled circle
        ctx.fillStyle = `${circleColor}80`; // Slight transparency for filled circle
        ctx.beginPath();
        ctx.arc(monsterX, monsterY - 15, radius, 0, Math.PI * 2);
        ctx.fill();

        // // Drawing distance label and line between character and monster
        // const distanceToPlayer = dw.distance(dw.c.x, dw.c.y, monster.x, monster.y);
        // ctx.lineWidth = 1;
        // ctx.beginPath();
        // ctx.moveTo(characterX, characterY);
        // ctx.lineTo(monsterX, monsterY);
        // ctx.stroke();

        // const midX = (characterX + monsterX) / 2;
        // const midY = (characterY + monsterY) / 2;
        // ctx.font = '16px Arial';
        // ctx.fillStyle = 'magenta';
        // ctx.fillText(`${distanceToPlayer.toFixed(2)}`, midX, midY);

        // Draw monster's attack radius
        const attackRadius = SETTINGS.visionConeRadius * dw.constants.PX_PER_UNIT_ZOOMED;
        if (monster.bad > 0 && monster.targetId !== dw.c.id) {
            const futureX = dw.toCanvasX(monster.x);
            const futureY = dw.toCanvasY(monster.y);
            const angle = Math.atan2(monster.dy, monster.dx);
            ctx.fillStyle = `#edff0040` // Transparent cone color
            ctx.beginPath();
            ctx.moveTo(futureX, futureY - 15);
            ctx.arc(futureX, futureY - 15, attackRadius, angle - SETTINGS.visionConeAngle / 2, angle + SETTINGS.visionConeAngle / 2);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        }
    });
});

dw.on("drawUnder", (ctx) => {
    if(!DRAWING.path) return false;

    // Function to draw an arrow between two points
    function drawArrow(fromX, fromY, toX, toY) {
        const headLength = 15; // Size of the arrowhead
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx); // Angle of the arrow

        // Draw the arrow line (body)
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke(); // Required to draw the line

        // Draw the arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.lineTo(toX, toY);
        ctx.stroke(); // Required to draw the arrowhead
    }

    // Check if there's a best target and a valid path
    if (bestTarget && bestTarget?.path?.length > 0) {
        ctx.strokeStyle = "purple"; // Set the line color to purple
        ctx.lineWidth = 3; // Set the line width based on path step size from SETTINGS

        // Initialize the first point of the path
        let prevX = dw.toCanvasX(bestTarget.path[0].x);
        let prevY = dw.toCanvasY(bestTarget.path[0].y);

        // Iterate through the rest of the path and draw arrows between each pair of points
        for (let i = 1; i < bestTarget.path.length; i++) {
            let currentX = dw.toCanvasX(bestTarget.path[i].x);
            let currentY = dw.toCanvasY(bestTarget.path[i].y);
            
            // Draw an arrow from the previous point to the current point
            drawArrow(prevX, prevY, currentX, currentY);

            // Update the previous point to the current one
            prevX = currentX;
            prevY = currentY;
        }

        // Finalize the drawing of the path with arrows
        ctx.stroke();
    }
});



dw.on("drawUnder", (ctx) => {
    if(!DRAWING.monsterScore) return false;

    const monsterFinder = Finder.getMonstersByScore(e => dw.mdInfo[e.md]?.isMonster) || [];

    // Iterate through the list of monsters
    for (let i = 0; i < monsterFinder.length; i++) {
        const { monster, score } = monsterFinder[i];
        const monsterX = dw.toCanvasX(monster.x);
        const monsterY = dw.toCanvasY(monster.y);

        // Draw score label next to the monster
        ctx.font = '30px Arial';
        ctx.fillStyle = score >= 0 ? 'green' : 'white'; // Green for positive score, white for negative
        ctx.fillText(`${Math.round(score)}`, monsterX, monsterY + 30);

        // If the monster is rare, draw rainbow-colored circles around it
        if (monster.r > 0) {
            const numCircles = monster.r; // Number of circles for rare monsters
            const circleSpacing = 12; // Spacing between circles
            const rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']; // Rainbow colors
            for (let j = 0; j < numCircles; j++) {
                const colorIndex = j % rainbowColors.length; // Cycle through rainbow colors
                ctx.strokeStyle = rainbowColors[colorIndex];
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    monsterX,
                    monsterY - 15,
                    dw.constants.PX_PER_UNIT_ZOOMED * 0.75 + ((j + 1) * circleSpacing), // Increase radius for each circle
                    0,
                    Math.PI * 2
                );
                ctx.stroke(); // Draw the circle
            }
        }
    }
});

dw.on('drawUnder', (ctx) => {
  ctx.lineWidth = 2
  ctx.strokeStyle = 'red'

  for (const plot of dw.account.plots) {
    if (dw.distance(dw.character.x, dw.character.y, plot.x, plot.y) > 32) {
      continue
    }

    ctx.beginPath()
    ctx.rect(
      dw.toCanvasX(plot.x),
      dw.toCanvasY(plot.y),
      plot.w * dw.constants.PX_PER_UNIT_ZOOMED,
      plot.h * dw.constants.PX_PER_UNIT_ZOOMED,
    )
    ctx.stroke()
  }
})

dw.on("drawOver", ctx => {
    if(!DRAWING.treeSpot) return false;

    // Drawing tree planting points
    const allPoints = Misc.getAllTreePlantingPoints();
    ctx.fillStyle = 'red';
    for (const point of allPoints) {
        const treeX = dw.toCanvasX(point.x);
        const treeY = dw.toCanvasY(point.y);
        ctx.beginPath();
        ctx.arc(treeX, treeY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
});

dw.on("hit", (data) => {
    for (let hit of data) {
      if (hit.rip && hit.target == dw.c.id) 
      { 
        const target = dw.e.find(e => e.id === hit.actor)
        const died = JSON.parse(localStorage.getItem("died") || '{}')
        const key = target.id === dw.c.id ? 'suicide' :`${target.md}-${target.lvl}+${target.r}`
        died[key] = died[key] ? died[key] + 1 : 1
        localStorage.setItem("died", JSON.stringify(died))
      }
      else if (hit.rip && hit.actor == dw.c.id) 
      {
        const target = dw.e.find(e => e.id === hit.target)
        if(dw.mdInfo[target.md]?.isMonster) {
            const killed = JSON.parse(localStorage.getItem("killed") || '{}')
            const key = `${target.md}-${target.lvl}+${target.r}`
            killed[key] = killed[key] ? killed[key] + 1 : 1
            localStorage.setItem("killed", JSON.stringify(killed))
        }
      } 
   }
})

// Function to draw statistics on the canvas
function drawStatistics(ctx) {
    const killed = JSON.parse(localStorage.getItem("killed") || '{}');
    const died = JSON.parse(localStorage.getItem("died") || '{}');
    const playerLevel = dw.c.lvl; // Assuming dw.c.lvl holds the player's level

    const canvasHeight = ctx.canvas.height;
    const canvasWidth = ctx.canvas.width;

    // Define positions for each column with a 200px spacing
    const xPositionKilled = 30; // First column for "killed"
    const xPositionKilledPlus2 = xPositionKilled + 200; // Second column for "+2" killed
    const xPositionDied = xPositionKilledPlus2 + 200; // Third column for "died"
    const xPositionDiedPlus2 = xPositionDied + 200; // Fourth column for "+2" died

    let yPosition = 70; // Start drawing from the top vertically

    // Calculate the dimensions of the background rectangle
    const rectWidth = xPositionDiedPlus2 + 300 - xPositionKilled; // Total width to cover all columns
    const rectHeight = 500; // Adjust the height as needed

    // Draw a semi-transparent black rectangle behind the columns
    ctx.globalAlpha = 0.6; // Set the opacity to 80%
    ctx.fillStyle = 'black';
    ctx.fillRect(xPositionKilled - 20, yPosition - 20, rectWidth, rectHeight);
    ctx.globalAlpha = 1.0; // Reset the opacity

    ctx.font = "12px Arial"; // Set font for text
    ctx.fillStyle = "white"; // Set color for kills/deaths (numbers)
    ctx.textAlign = "left"; // Align text to the left for consistent display

    // Helper function to sort the object by the rules
    function sortStatistics(statistics) {
        const entries = Object.entries(statistics);
        // First, sort keys ending with '+2', then by value in descending order
        return entries
            .sort(([keyA, valA], [keyB, valB]) => {
                const aEndsWith2 = keyA.endsWith('+2');
                const bEndsWith2 = keyB.endsWith('+2');
                if (aEndsWith2 && !bEndsWith2) return -1;
                if (!aEndsWith2 && bEndsWith2) return 1;
                return valB - valA; // Sort by value in descending order
            });
    }

    // Function to draw monster statistics with color and opacity based on level and rarity
    function drawMonster(ctx, monster, value, xPosition, yPos) {
        const match = monster.match(/^(.+?)(\d+)(\+[\d])/); // Extract monster parts (name, level, rarity)
        if (match) {
            const [_, name, level, rarity] = match;
            const monsterLevel = parseInt(level);
            const rarityColor = rarity === '+0' ? '#90EE90' : '#DDA0DD'; // Set color based on rarity

            // Set opacity if monster level is lower than player's level
            if (monsterLevel < playerLevel) {
                ctx.globalAlpha = 0.5;
            } else {
                ctx.globalAlpha = 1.0; // Reset opacity
            }

            // Draw the monster name and level in appropriate color
            ctx.fillStyle = rarityColor;
            ctx.fillText(`${name}${level} ${rarity}`, xPosition, yPos);

            // Draw the value (kills/deaths) in white
            ctx.fillStyle = "white";
            ctx.fillText(`${value}`, xPosition + 150, yPos); // Draw the value to the right
        }
    }

    // Function to draw statistics for a section
    function drawSection(label, stats, xPosition, xPositionPlus2) {
        let yPos = 75; // Reset yPosition for each section
        let yPos2 = 75; // Reset yPosition for each section

        ctx.fillText(label, xPosition, yPos);
        yPos += 12;
        yPos2 += 12;

        // Display statistics, dividing into two columns for "+2" and regular keys
        for (const [monster, value] of stats) {
            if (monster.endsWith('+2') || monster.endsWith('+1')) {
                drawMonster(ctx, monster, value, xPositionPlus2, yPos); // Keys ending with +2/+1 go to subcolumn
                yPos += 12;
            } else {
                drawMonster(ctx, monster, value, xPosition, yPos2); // Regular keys stay in main column
                yPos2 += 12;
            }
        }

        // Reset opacity after drawing each section
        ctx.globalAlpha = 1.0;
    }

    // Sort the killed and died statistics
    const sortedKilled = sortStatistics(killed);
    const sortedDied = sortStatistics(died);

    // Display heading
    ctx.fillText("Statistics", xPositionKilled, yPosition - 10);

    // Display Killed statistics in the left sections
    drawSection("Monsters Killed:", sortedKilled, xPositionKilled, xPositionKilledPlus2);

    // Display Died statistics in the right sections
    drawSection("Monsters Died From:", sortedDied, xPositionDied, xPositionDiedPlus2);
}

// Hooking into the canvas draw loop
dw.on("drawOver", (ctx) => {
    drawStatistics(ctx); // Draw statistics on the screen
});
