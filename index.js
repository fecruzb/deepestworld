const IS_ACTIVE = true;
dw.debug = true;
let lastPosition = { x: dw.character.x, y: dw.character.y };
let lastMoveTime = Date.now();
let bestPathArray = []

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
    visionConeAngle: Math.PI * 1.10, 
    visionConeRadius: 3.2, 
    predictionTime: 1, 
    pathStepSize: 1,
    maxPathfindingIterations: 500,
    interpolationSteps: 100,
    gooProximityRange: 2,
    monsterProximityRange: 1.5,
};

const SKILLS = {
    attack: {
        enable: true,
        index: 0,
        range: 0.7
    },
    shield: {
        enable: false,
        index: 2,
        range: 0.5
    },
    heal: {
        enable: true,
        index: 1,
        range: 0.5,
        hpThreshold: 0.6
    },
   dash: {
        enable: true,
        index: 3,
        range: 2.6,
        minRange: 1.75
    },
    teleport: {
        enable: true,
        index: 4,
        range: 5,
        minRange: 3,
        minSavedRange: 1.75
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
    conservation: {
        enable: false,
        index: 9,
        range: 0.88,
        hpThreshold: 0.4,
    },
    taunt: {
        enable: false,
        index: 9,
        range: 0.88
    },
    aoe: {
        enable: false,
        index: 9,
        range: 0.88
    },
}

/**
 * Configuration flags for various behaviors
 */
const configFlags = {
    attackNextScoreMonster: true,
    moveToMission: false,
    enableRandomMovement: false,
    prioritizeResource: true,
    prioritizeMission: false,
    followAlliedCharacter: false,
    healAndFollowAllied: false,
    enableTeleport: true,
    moveToShrub: false
};

const protectList = [];
const healList = [];

/**
 * Represents a node in the pathfinding algorithm.
 * @class
 */
class Node {
    /**
     * Creates an instance of a Node.
     * @param {Object} pos - The current position (x, y).
     * @param {number} g - The cost from the start to this node.
     * @param {number} h - The heuristic (estimated cost to the destination).
     * @param {Node|null} [parent=null] - The parent node in the path.
     */
    constructor(pos, g, h, parent = null) {
        this.pos = pos; // Current position (x, y)
        this.g = g; // Cost from the start to this point
        this.h = h; // Heuristic (estimated cost to the destination)
        this.f = g + h; // Total cost f = g + h
        this.parent = parent; // Previous node in the path
    }
}

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
    isPointInCone(observer, point) {
        const observerDir = { x: observer.dx, y: observer.dy };
        const toPoint = { x: point.x - observer.x, y: point.y - observer.y };
        const angleToPoint = this.angleBetween(observerDir, toPoint);
        const distToPoint = this.magnitude(toPoint);
        return angleToPoint <= SETTINGS.visionConeAngle / 2 && distToPoint <= SETTINGS.visionConeRadius;
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
        const futureX = observer.x + observer.dx * observer.moveSpeed * time;
        const futureY = observer.y + observer.dy * observer.moveSpeed * time;
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
        for (let t = 0; t <= SETTINGS.predictionTime; t += 1) {
            const futureObserver = this.getObserverPositionAtTime(observer, t);
            if (this.isPointInCone(futureObserver, startPos) || this.isPointInCone(futureObserver, endPos)) {
                return true;
            }
            for (let i = 0; i <= SETTINGS.interpolationSteps; i++) {
                const lerpT = i / SETTINGS.interpolationSteps;
                const currentPos = this.lerp(startPos, endPos, lerpT);
                if (this.isPointInCone(futureObserver, currentPos)) {
                    return true;
                }
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
            const terrain = dw.getTerrainAt(point.x, point.y, 0);
            if (terrain !== 0 || dw.getTerrainAt(point.x, point.y, -1) < 1) return true;
        }
        return false;
    },

    /**
     * Determines if a direct line between two points is safe from monster detection.
     * @param {Object} target - The target point (x, y).
     * @param {Object} origin - The origin point (x, y).
     * @returns {boolean} True if the line between the points is safe, false otherwise.
     */
    isSafe(target) {
        for (const monster of Finder.getMonsters()) {
            if (monster.targetId !== dw.c.id && monster.bad > 0 && this.isPointInCone(monster, target)) {
                return false;
            }
        }
        return true;
    },

    /**
     * Determines if a direct line between two points is safe from monster detection.
     * @param {Object} target - The target point (x, y).
     * @param {Object} origin - The origin point (x, y).
     * @returns {boolean} True if the line between the points is safe, false otherwise.
     */
    isSafePath(target, origin) {
        for (const monster of Finder.getMonsters()) {
            if (monster.targetId !== dw.c.id && monster.bad > 0 && this.isLineInConeOfVision(monster, target, origin)) {
                return false;
            }
        }
        return true;
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
        if (!dw.hasTag(monster, "goo")) return count;
        Finder.getMonsters().forEach(other => {
            if (other.id !== monster.id && dw.hasTag(other, "goo") && dw.distance(monster.x, monster.y, other.x, other.y) <= SETTINGS.gooProximityRange) {
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
     * Generates a safe path from the character's position to a target position, avoiding monsters.
     * @param {Object} characterPos - The starting position (x, y).
     * @param {Object} targetPos - The target position (x, y).
     * @returns {Array<Object>} The safe path as an array of positions (x, y).
     */
    generateSafePath(characterPos, targetPos) {
        // Se a distância entre o personagem e o alvo for menor que 1, retorna caminho direto
        if (dw.distance(characterPos.x, characterPos.y, targetPos.x, targetPos.y) < 0.7) {
            return [characterPos, targetPos];
        }

        const openList = [];
        const closedList = [];
        const path = [];
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
        ];

        let iterations = 0;

        const startNode = new Node(characterPos, 0, dw.distance(characterPos.x, characterPos.y, targetPos.x, targetPos.y));
        openList.push(startNode);

        while (openList.length > 0) {
            iterations++;
            if (iterations > SETTINGS.maxPathfindingIterations) {
                console.log("Iteration limit reached. Aborting!");
                return path.reverse(); // Return the path generated so far
            }

            // Select the node with the lowest total cost (f)
            let currentNode = openList.reduce((prev, node) => node.f < prev.f ? node : prev);

            // If the destination is reached, build the path
            if (dw.distance(currentNode.pos.x, currentNode.pos.y, targetPos.x, targetPos.y) <= SETTINGS.pathStepSize) {
                let node = currentNode;
                while (node) {
                    path.push(node.pos);
                    node = node.parent;
                }
                path.reverse(); // Retorna o caminho da origem ao destino

                // Garante que o último ponto seja exatamente targetPos
                if (path.length === 0 || (path[path.length - 1].x !== targetPos.x || path[path.length - 1].y !== targetPos.y)) {
                    path.push(targetPos); // Adiciona o ponto de destino se não estiver no caminho
                }

                return path;
            }

            // Remove the current node from the open list and add it to the closed list
            openList.splice(openList.indexOf(currentNode), 1);
            closedList.push(currentNode);

            // Sort directions based on proximity to the target
            const sortedDirections = directions.slice().sort((a, b) => {
                const distA = dw.distance(
                    currentNode.pos.x + a.x * SETTINGS.pathStepSize,
                    currentNode.pos.y + a.y * SETTINGS.pathStepSize,
                    targetPos.x,
                    targetPos.y
                );
                const distB = dw.distance(
                    currentNode.pos.x + b.x * SETTINGS.pathStepSize,
                    currentNode.pos.y + b.y * SETTINGS.pathStepSize,
                    targetPos.x,
                    targetPos.y
                );
                return distA - distB; // Sort from closest to furthest
            });

            // Explore neighboring nodes
            for (const direction of sortedDirections) {
                const newPos = {
                    x: currentNode.pos.x + direction.x * SETTINGS.pathStepSize,
                    y: currentNode.pos.y + direction.y * SETTINGS.pathStepSize
                };

                if (Util.isPathBlocked(newPos, currentNode.pos)) 
                {
                    continue;
                }

                // Check if the new node is safe or already explored
                if (!Util.isSafe(newPos) || closedList.find(node => node.pos.x === newPos.x && node.pos.y === newPos.y)) {
                    continue;
                }

                const gScore = currentNode.g + SETTINGS.pathStepSize;
                let neighborNode = openList.find(node => node.pos.x === newPos.x && node.pos.y === newPos.y);

                // If the neighbor node is not in the open list, or the new path is cheaper
                if (!neighborNode) {
                    const hScore = dw.distance(newPos.x, newPos.y, targetPos.x, targetPos.y);
                    neighborNode = new Node(newPos, gScore, hScore, currentNode);
                    openList.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = gScore + neighborNode.h;
                    neighborNode.parent = currentNode;
                }
            }
        }
        console.log("No path found.");
        return path; // Return the path generated so far or empty if no path found
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
        return (dw.character.hp / dw.character.maxHp) < percentage;
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
     * Checks if the character has the 'graft' effect active.
     * @returns {boolean} True if the character has the graft effect, otherwise false.
     */
    hasGraft() {
        return 'graft' in dw.character.fx;
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
                    dw.mdInfo[entity.md]?.isResource
                ) && 
                !dw.mdInfo[entity.md]?.isSafe
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
     * Retrieves the closest monster that matches a given filter.
     * @param {Function} filter - Optional filter function to apply.
     * @returns {Object|null} The closest monster entity or null if none found.
     */
    getClosestMonster(filter) {
        return Finder.getMonsters().find(filter) || null;
    },

    /**
     * Retrieves the IDs of characters to follow from the protect list.
     * @returns {Array<number>} Array of character IDs to follow.
     */
    getFollowCharacters() {
        return Finder.getEntities().filter(entity => protectList.includes(entity.name)).map(entity => entity.id);
    },

    /**
     * Retrieves the target entity to protect.
     * @returns {Object|null} The protect target entity or null if none found.
     */
    getProtectTarget() {
        return Finder.getEntities().find(entity => protectList.includes(entity.name)) || null;
    },

    /**
     * Retrieves the target entity to heal.
     * @returns {Object|null} The heal target entity or null if none found.
     */
    getHealTarget() {
        return Finder.getEntities().find(entity => healList.includes(entity.name)) || null;
    },

    /**
     * Retrieves the nearest monster that should be taunted based on its target.
     * @returns {Object|null} The nearest monster to taunt, with skill info, or null if none found.
     */
    getNearestToTaunt() {
        if (!SKILLS.taunt.enable) return null;
        const enemy = Finder.getClosestMonster(entity => Finder.getFollowCharacters().includes(entity.targetId));
        if (enemy && dw.canUseSkill(SKILLS.taunt.index, enemy.id)) {
            return { ...enemy, toSkill: SKILLS.taunt.index };
        }
        return null;
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

            if(dw.mdInfo[monster.md].isMonster) {
                score += 15
                if (monster.hp < monster.maxHp) score += 10;
                if (monster.bad && Util.isTrajectoryInMonsterCone(monster, dw.c)) score -= 2;
                score -= Util.checkGooProximity(monster) * 5;
                score -= Util.checkMonsterNearby(monster) * 20;
                if ([dw.character.id, ...Finder.getFollowCharacters()].includes(monster.targetId)) score += 100;
                score -= Util.distanceToTarget(monster) * 1.5;
                score -= Util.countMonstersAlongPath(monster) * 30;

                if (monster.r > 0) {
                    score += (monster.r > 2) ? -(monster.r * 20) : monster.r * 20;
                }

                if(dw.mdInfo[monster.md].canHunt) {
                    score -= 10;
                }
            }
            if(dw.mdInfo[monster.md].isResource) { 
                score += 15
                score -= Util.distanceToTarget(monster);
                score -= Util.checkMonsterNearby(monster) * 20;
                score -= Util.countMonstersAlongPath(monster) * 20;
            }
            return { monster, score };
        }).sort((a, b) => b.score - a.score);
    },

    /**
     * Retrieves the next monster to attack based on score.
     * @returns {Object|null} The next monster to attack, or null if none found.
     */
    getNextMonster() {
        if (!configFlags.attackNextScoreMonster) return null;
        const monsters = Finder.getMonstersByScore() || [];
        

        // iterate to find a monster with path
        // find first mosnter with path and return the monster and the path
        const target = monsters?.find(m => {
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
            bestPathArray = target.path
            return { 
                ...target?.monster,
                path: target.path,
                score: target.score, 
                toAttack: dw.mdInfo[target?.monster?.md]?.isMonster,
                toGather: dw.mdInfo[target?.monster?.md]?.isResource
            };
        }
        
        bestPathArray = []
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
            SKILLS.shield.enable &&
            !Character.hasLifeshield() &&
            !Character.hasShieldRecovery()
        ) {
            if (dw.canUseSkill(SKILLS.shield.index, dw.character.id)) {
                DEBUG.log(`Using <span style="color: hotpink">Lifeshield</span>`);
                dw.useSkill(SKILLS.shield.index, dw.character.id);
            }
        }
    },

    /**
     * Uses the graft skill if conditions are met (not being attacked, skill enabled, no graft effect).
     */
    useGraftSkill() {
        if (
            !Character.isBeingAttacked() &&
            SKILLS.graft.enable &&
            !Character.hasGraft()
        ) {
            if (dw.canUseSkill(SKILLS.graft.index, dw.character.id)) {
                dw.useSkill(SKILLS.graft.index, dw.character.id);
            }
        }
    },

    /**
     * Uses the heal skill if conditions are met (not casting, not being attacked, skill enabled, HP below a threshold).
     */
    useHealSkill() {
        if (
            !Character.isCasting() &&
            !Character.isBeingAttacked() &&
            SKILLS.heal.enable &&
            Character.isHpBelowPercentage(SKILLS.heal.hpThreshold)
        ) {
            if (dw.canUseSkill(SKILLS.heal.index, dw.character.id)) {
                DEBUG.log(`Using <span style="color: hotpink">Heal</span>. Life below <span style="color: pink">${SKILLS.heal.hpThreshold * 100}%</span>`);
                dw.useSkill(SKILLS.heal.index, dw.character.id);
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
        return Finder.getMonsters().filter(monster => dw.distance(x, y, monster.x, monster.y) < SKILLS.aoe.range).length > 1;
    },

    /**
     * Uses a ranged attack on a target if within range and not currently casting.
     * @param {Object} target - The target to attack.
     * @returns {boolean} True if the ranged attack was used, otherwise false.
     */
    useRangedAttack(target) {
        if (
            Util.distanceToTarget(target) <= SKILLS.arrow.range &&
            !Character.isCasting() &&
            dw.canUseSkill(SKILLS.arrow.index, target.id)
        ) {
            DEBUG.log("Using ranged attack skill.");
            dw.stop();
            dw.useSkill(SKILLS.arrow.index, target.id);
            return true;
        }
        return false;
    },

    /**
     * Follows the target and attacks using either ranged or melee skills.
     * @param {Object} target - The target to attack.
     * @param {number} [skillRange=0.75] - The range at which to use melee skills.
     */
    followAndAttack(target) {
        dw.setTarget(target.id);
        const distToTarget = Util.distanceToTarget(target);

        // Use ranged attack if possible
        if (SKILLS.arrow.enable && !Character.isBeingAttacked()) {
            if (Character.isCasting() || Action.useRangedAttack(target)) return;
        }

        // Use melee attack or AOE if in range
        if (distToTarget <= SKILLS.attack.range) {
            let attackSkill = SKILLS.attack.index;

            // Use conservation skill if needed
            if (!Character.hasConservation() && SKILLS.conservation.enable && Character.isHpBelowPercentage(SKILLS.conservation.hpThreshold)) {
                attackSkill = SKILLS.conservation.index;
            }

            // Use AOE skill if multiple enemies are in range
            if (
                SKILLS.aoe.enable &&
                Action.shouldUseAoe(target.x, target.y) && 
                dw.canUseSkill(SKILLS.aoe.index, target.id)
            ) {
                DEBUG.log(`<span style="color: tomato;">AOE Attacking</span> <span style="color: cyaN">${dw.mdInfo[target.md].name}</span>`);
                dw.useSkill(SKILLS.aoe.index, target.x, target.y);
            } else if (SKILLS.attack.enable && dw.canUseSkill(attackSkill, target.id)) {
                DEBUG.log(`<span style="color: tomato;">Attacking</span> <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
                dw.useSkill(attackSkill, target.id);
            }
        } else {
            Movement.moveCloserToTarget(target)
        }
    },

    /**
     * Follows the target and uses a specific skill on it.
     * @param {Object} target - The target to use the skill on.
     * @param {number} skill - The skill index to use.
     */
    followAndUseSkill(target, skill) {
        dw.setTarget(target.id);
        if (dw.canUseSkill(skill, target.id)) {
            dw.move(target.x, target.y);
            dw.useSkill(skill, target.id);
            DEBUG.log(`Using skill on target: <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
        } else {
            dw.move(target.x, target.y);
        }
    },
};

/**
 * Movement-related functions for managing character positioning and idle state.
 * @namespace
 */
const Movement = {
    /**
     * Check the zone level and trigger suicide if necessary.
     */
    checkZoneLevel() {
        if (dw.getZoneLevel(dw.character.x, dw.character.y, dw.character.z) <= 38) dw.suicide();
    },

    /**
     * Check if the character is on the correct terrain, trigger suicide if not.
     */
    checkTerrain() {
        if (dw.character.z !== 0) dw.suicide();
    },

    /**
     * Checks if the character has been idle for 1 minute and commits suicide if true.
     */
    checkCharacterIdle() {
        const currentTime = Date.now();
        if (dw.distance(dw.character.x, dw.character.y, lastPosition.x, lastPosition.y) <= 0.5 && currentTime - lastMoveTime >= 60000) {
            DEBUG.log("Character idle for 1 minute, committing suicide.");
            dw.suicide();
            lastMoveTime = currentTime;
        } else {
            lastPosition = { x: dw.character.x, y: dw.character.y };
            lastMoveTime = currentTime;
        }
    },

    /**
     * Moves the character closer to the target using either a path or direct movement.
     * @param {Object} target - The target object (e.g., monster) to move toward.
     */
    moveCloserToTarget(target) {
        if (target?.path) {
            const nextPosition = target.path[1];
            if(dw.mdInfo[target.md].isMonster) {
                Movement.getCloserPath(target.path);
            }
            dw.move(nextPosition.x, nextPosition.y);
            DEBUG.log(`<span style="color: lime">Pathfinding</span> to <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
        } else {
            if(dw.mdInfo[target.md].isMonster) {
                Movement.getCloserMove(target);
            }
            dw.move(target.x, target.y);
            DEBUG.log(`<span style="color: lime">Moving</span> to <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
        }
    },

    /**
     * Uses movement skills (Dash/Teleport) to get closer to the next point on a path.
     * @param {Array<Object>} path - Array of points representing the path.
     */
    getCloserPath(path) {
        const nextPosition = path[1];
        const distanceNext = dw.distance(nextPosition.x, nextPosition.y, dw.c.x, dw.c.y);

        if (SKILLS.dash.enable && distanceNext >= SKILLS.dash.minRange && distanceNext <= SKILLS.dash.range && path.length === 2) {
            if (dw.canUseSkill(SKILLS.dash.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Dashing</span> to <span style="color: yellow">${Math.round(nextPosition.x)}</span>,<span style="color: yellow">${Math.round(nextPosition.y)}</span> (${Math.round(distanceNext)})`);
                dw.useSkill(SKILLS.dash.index, nextPosition.x, nextPosition.y);
            }
        }

        const lastPosition = path[path.length - 1];
        const distanceLast = dw.distance(lastPosition.x, lastPosition.y, dw.c.x, dw.c.y);
        const distanceTotal = Util.calculateTotalDistance(path);
        const distanceDiff = distanceTotal - distanceLast;

        if (SKILLS.teleport.enable && distanceLast >= SKILLS.teleport.minRange && distanceLast <= SKILLS.teleport.range && distanceDiff > SKILLS.teleport.minSavedRange) {
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

        if (SKILLS.dash.enable && distanceToTarget >= SKILLS.dash.minRange && distanceToTarget <= SKILLS.dash.range) {
            if (dw.canUseSkill(SKILLS.dash.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Dashing</span> to <span style="color: yellow">${Math.round(target.x)}</span>,<span style="color: yellow">${Math.round(target.y)}</span> (${Math.round(distanceToTarget)})`);
                dw.useSkill(SKILLS.dash.index, target.x, target.y);
            }
        }

        if (SKILLS.teleport.enable && distanceToTarget >= SKILLS.teleport.minRange && distanceToTarget <= SKILLS.teleport.range) {
            if (dw.canUseSkill(SKILLS.teleport.index, dw.c.id)) {
                DEBUG.log(`<span style="color: yellow">Teleporting</span> to <span style="color: yellow">${Math.round(target.x)}</span>,<span style="color: yellow">${Math.round(target.y)}</span> (${Math.round(distanceToTarget)})`);
                dw.useSkill(SKILLS.teleport.index, target.x, target.y);
                dw.stop();
            }
        }
    },

    /**
     * Moves the character randomly in one of four directions.
     */
    randomMove() {
        if (!configFlags.enableRandomMovement) return;

        const direction = Math.floor(Math.random() * 4);
        let newX = dw.character.x;
        let newY = dw.character.y;

        switch (direction) {
            case 0: newX += 2; break;
            case 1: newX -= 2; break;
            case 2: newY += 2; break;
            case 3: newY -= 2; break;
        }

        DEBUG.log(`Moving randomly to [${newX}, ${newY}]`);
        dw.move(newX, newY);
    },

    /**
     * Moves the character to a mission target.
     */
    moveMission() {
        if (configFlags.moveToMission && dw.character.mission) {
            DEBUG.log("Moving to mission target.");
            dw.move(dw.character.mission.x, dw.character.mission.y);
        }
    },

    /**
     * Moves the character toward a shrub and enters if close enough.
     */
    moveShrub() {
        if (!configFlags.moveToShrub) return;

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
     * Follows a protected allied character.
     */
    followAllied() {
        if (!configFlags.followAlliedCharacter) return;

        const target = Finder.getProtectTarget();
        if (target) {
            DEBUG.log(`Following allied character: ${target.name}`);
            dw.move(target.x, target.y);
        }
    },

    /**
     * Follows and heals an allied character if needed.
     */
    followAndHealAllied() {
        if (!configFlags.healAndFollowAllied) return;

        const target = Finder.getHealTarget();
        if (target) {
            const distToTarget = Util.distanceToTarget(target);
            DEBUG.log(`Attempting to heal ${target.name}. Current distance: ${distToTarget}`);
            if (distToTarget > 3) dw.move(target.x, target.y);

            if (dw.canUseSkill(SKILLS.heal.index, target.id)) {
                if (target.hp <= target.maxHp * 0.9) {
                    dw.useSkill(SKILLS.heal.index, target.id);
                    DEBUG.log(`Healing ${target.name}`);
                } else {
                    DEBUG.log(`${target.name} is healthy, no healing needed.`);
                }
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
        const bestPath = Util.generateSafePath(dw.c, target); // Generate the safest path to the target
        if (bestPath.length > 0) {
            return { path: Util.optimizePath(bestPath), target }; // Optimize the path for better movement
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
            bestPathArray = Movement.findPath(monsterFinder[0].monster); // Generate the safest path to the monster
        }
    }
};

const Misc = {
    /**
     * Cleans the inventory by removing unwanted items, combining resources, and sorting the inventory.
     */
    cleanInventory() {
        const itemsToCombine = [];
        const itemsToRemove = [];

        // Loop through each item in the inventory
        dw.character.inventory.forEach((item, index) => {
            if (!item) return;

            const metaData = dw.mdInfo[item.md];
            const isGear = metaData?.isArmor || metaData?.isAccessory || metaData?.isWeapon;
            const isRune = metaData?.isSkill && Array.from(metaData?.tags || []).includes("rune");
            const isPassive = Array.from(metaData?.tags || []).includes("passive");
            const modKeys = Object.keys(item.mods || {});
            const modValues = Object.values(item.mods || {});
            const modCount = modKeys.length;

            /**
             * Helper function to determine if an item has strong mods based on individual values or the sum of valid mod values.
             */
            const hasStrongMods = (validMods, minModValue = 5, sumThreshold = 8) => {
                let sumOfValidMods = 0;
                let hasModAboveThreshold = false;

                modValues.forEach((mod, i) => {
                    if (validMods.includes(modKeys[i])) {
                        sumOfValidMods += mod;
                        if (mod >= minModValue) {
                            hasModAboveThreshold = true;
                        }
                    }
                });

                return hasModAboveThreshold && sumOfValidMods >= sumThreshold;
            };

            /**
             * Helper function to check if an item has mods with high values (>= 6).
             * @returns {boolean} True if the item has high mod values, otherwise false.
             */
            const hasHighModValues = (min = 8) => modValues.some(mod => mod >= min);

            if(hasHighModValues()) {
                return
            }

            // Handle gear items (weapons, armor, accessories)
            if (isGear) {
                const weaponMods = ["physDmgIncLocal", "physDmgInc", "physDmgLocal", "physDmg", "dmg", "hpLeech", "hpGain", "gcdr", "gcdrLocal"];
                const accessoryMods = ["physDmgIncLocal", "physDmgInc", "physDmgLocal", "physDmg", "dmg", "hpInc", "hpRegen", "hp"];
                const armorMods = ["hpInc", "hpRegen", "hp"];

                // Preserve weapons with 2+ relevant mods or strong mods
                if (metaData.isWeapon && (hasStrongMods(weaponMods))) return;

                // Preserve accessories with 2+ relevant mods or strong mods
                if (metaData.isAccessory && (hasStrongMods(accessoryMods))) return;

                // Preserve armor with 2+ relevant mods or strong mods
                if (metaData.isArmor && (hasStrongMods(armorMods))) return;

                // Preserve items with 4+ mods or high mod values
                if (modCount >= 4) return;

                // comment to remove items, be careful
                return;

                // Mark the item for removal
                itemsToRemove.push(index);
            }

            // Handle rune items
            else if (isRune) {
                const avoidRunes = ["aimed", "cast", "charged", "instant", "deferring"];
                const shouldAvoid = avoidRunes.some(type => Array.from(metaData?.tags || []).includes(type));
                const socketsCount = item?.sockets?.length || 0;

                // Preserve runes with 3+ sockets
                if (socketsCount >= 3) {
                    console.log(`Preserving socketed rune: ${metaData.name} [${item.qual}] +${socketsCount}`);
                    return;
                }
                
                // comment to remove items, be careful
                return;

                // Remove runes that should be avoided
                if (shouldAvoid) {
                    itemsToRemove.push(index);
                    console.log(`Removing rune: ${metaData.name} [${item.qual}] +${socketsCount}`);
                }
            }

            // Handle passive items
            else if (isPassive) {
                const passiveMods = ["hpInc", "hpRegenInc", "gcdr", "physDmgInc"];

                // Preserve passives with strong mods or high mod values
                if (hasStrongMods(passiveMods, 4, 7)) return;

                if(hasHighModValues(6)) {
                    return
                }

                // comment to remove items, be careful
                return;

                // Mark the passive for removal
                itemsToRemove.push(index);
            }

            // Handle combineable resources
            else if (["wood", "flax", "rock", "portalScroll"].includes(item.md) || metaData.isMat) {
                itemsToCombine.push(index);
            }
        });

        // Remove marked items
        if (itemsToRemove.length > 0) {
            console.log("Removing items:", itemsToRemove);
            // itemsToRemove.forEach(inventoryIndex => dw.deleteItem(inventoryIndex));
        }

        // Combine resources
        if (itemsToCombine.length > 0) {
            dw.combineItems(itemsToCombine);
        }

        // Sort inventory after cleaning
        dw.sortInventory();
    }
}


/**
 * Event handling and game loop
 */
const eventPriority = [
    Misc.cleanInventory,
    Action.useHealSkill,
    Action.useGraftSkill,
    Action.useShieldSkill,
    Finder.getNearestToTaunt,
    Finder.getNextMonster,
    Movement.moveShrub,
    Movement.moveMission,
    Movement.followAllied,
    Movement.followAndHealAllied,
    Movement.checkZoneLevel,
    Movement.checkTerrain,
    Movement.checkCharacterIdle
];

/**
 * Handles game events based on event priority and acts accordingly.
 */
function handleGameEvents() {
    for (let eventFunction of eventPriority) {
        const target = eventFunction();
        if (!target) continue;

        console.log(target)

        const attackers = Finder.getEntities().filter(e => e.targetId === dw.character.id && dw.mdInfo[e.md]?.isMonster);

        // Wait if cooldowns are still active or HP is below max
        // if (target.toAttack && attackers.length === 0 && (dw.character.gcd >= Date.now() || dw.character.hp < dw.character.maxHp)) {
        //     DEBUG.log("Waiting...");
        //     dw.stop();
        //     return;
        // }

        // Handle skill-based actions
        if (target.toSkill >= 0) {
            Action.followAndUseSkill(target, target.toSkill);
        }
        // Handle attack actions
        else if (target.toAttack) {
            console.log("attack", target)
            Action.followAndAttack(target);
        }
        // Handle gathering actions
        else if (target.toGather) {
            Movement.moveAndGather(target);
        }
        return; // Stop processing further events after acting on the current one
    }
    DEBUG.log("No relevant actions. Character standing by.");
}

/**
 * Main game loop that continuously checks for events to handle.
 */
function gameLoop() {
    if (IS_ACTIVE) {
        handleGameEvents();
    }
    setTimeout(gameLoop, 250); // Re-run the loop every 250ms
}

gameLoop();

dw.on('drawUnder', (ctx) => {
    const monsterFinder = Finder.getMonstersByScore(e => dw.mdInfo[e.md]?.isMonster) || [];

    // Get character's canvas coordinates
    const characterX = dw.toCanvasX(dw.c.x);
    const characterY = dw.toCanvasY(dw.c.y);

    // Draw the monsters and related information
    for (let i = 0; i < monsterFinder.length; i++) {

        const { monster, score } = monsterFinder[i];
        const monsterX = dw.toCanvasX(monster.x);
        const monsterY = dw.toCanvasY(monster.y);

        // Set default circle color and radius
        let circleColor = '#edff00'; // Default yellow for regular monsters
        let radius = dw.constants.PX_PER_UNIT_ZOOMED * 0.75;

        // Set the color and stroke based on monster's score and position
        if (i === 0 && score >= 0) {
            circleColor = '#00ff00'; // Green for the highest score
            ctx.strokeStyle = '#00ff0050';
        } else if (score < 0) {
            circleColor = '#ff0000'; // Red for negative scores
            ctx.strokeStyle = '#ff000050';
        } else {
            ctx.strokeStyle = '#edff0050'; // Yellow for others
        }

        // Draw filled circle for each monster
        ctx.fillStyle = `${circleColor}80`; // Slight transparency for filled circle
        ctx.beginPath();
        ctx.arc(monsterX, monsterY - 15, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw line from character to monster and show distance
        const distanceToPlayer = dw.distance(dw.c.x, dw.c.y, monster.x, monster.y);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(characterX, characterY);
        ctx.lineTo(monsterX, monsterY);
        ctx.stroke();

        // Show distance label between player and monster
        const midX = (characterX + monsterX) / 2;
        const midY = (characterY + monsterY) / 2;
        ctx.font = '16px Arial';
        ctx.fillStyle = 'magenta';
        ctx.fillText(`${distanceToPlayer.toFixed(2)}`, midX, midY);

        // Draw monster's attack radius using losConeRadius from SETTINGS
        const attackRadius = SETTINGS.visionConeRadius * dw.constants.PX_PER_UNIT_ZOOMED;

        if (monster.bad > 0 && monster.targetId !== dw.c.id) {

            // Function to calculate future position of the monster
            function getFuturePosition(monster, t) {
                const futureX = monster.x + monster.dx * monster.moveSpeed * t;
                const futureY = monster.y + monster.dy * monster.moveSpeed * t;
                return { x: futureX, y: futureY };
            }

            // Draw vision cone for future positions of the monster
            for (let t = 0; t <= SETTINGS.predictionTime; t += 1) {
                const futurePos = getFuturePosition({
                    x: monsterX,
                    y: monsterY,
                    dx: monster.dx * dw.constants.PX_PER_UNIT_ZOOMED,
                    dy: monster.dy * dw.constants.PX_PER_UNIT_ZOOMED,
                    moveSpeed: monster.moveSpeed * dw.constants.PX_PER_UNIT_ZOOMED,
                }, t);
                const futureX = futurePos.x;
                const futureY = futurePos.y;

                // Calculate monster's vision angle
                const angle = Math.atan2(monster.dy, monster.dx);

                // Draw monster's future vision cone
                ctx.fillStyle = t === 0 ? `#edff0040` : `#edff0015`; // Transparent cone color
                ctx.beginPath();
                ctx.moveTo(futureX, futureY - 15);
                ctx.arc(
                    futureX,
                    futureY - 15,
                    attackRadius,
                    angle - SETTINGS.visionConeAngle / 2,
                    angle + SETTINGS.visionConeAngle / 2
                );
                ctx.closePath();
                if (t === 0) ctx.stroke();
                ctx.fill();
            }
        }

        // Draw score label next to the monster
        ctx.font = '30px Arial';
        ctx.fillStyle = score >= 0 ? 'green' : 'white';
        ctx.fillText(`${Math.round(score)}`, monsterX, monsterY + 30);

        // Check for rare monster and draw concentric circles
        if (monster.r > 0) {
            const numCircles = monster.r;
            const circleSpacing = 12;
            for (let j = 0; j < numCircles; j++) {
                ctx.strokeStyle = 'magenta';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    monsterX,
                    monsterY - 15,
                    (radius) + ((j + 1) * circleSpacing),
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
        }
    }

    // Draw lines between monsters that are less than 2 units apart and show their distances
    for (let i = 0; i < monsterFinder.length; i++) {
        const monster1 = monsterFinder[i].monster;
        const monsterX1 = dw.toCanvasX(monster1.x);
        const monsterY1 = dw.toCanvasY(monster1.y);

        for (let j = i + 1; j < monsterFinder.length; j++) {
            const monster2 = monsterFinder[j].monster;
            const monsterX2 = dw.toCanvasX(monster2.x);
            const monsterY2 = dw.toCanvasY(monster2.y);

            // Calculate distance between two monsters
            const distanceBetweenMonsters = dw.distance(monster1.x, monster1.y, monster2.x, monster2.y);

            if (distanceBetweenMonsters <= SETTINGS.gooProximityRange) { // Use SETTINGS for proximity range
                // Draw line between monsters
                ctx.strokeStyle = 'purple';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(monsterX1, monsterY1);
                ctx.lineTo(monsterX2, monsterY2);
                ctx.stroke();

                // Draw distance label between monsters
                const midX = (monsterX1 + monsterX2) / 2;
                const midY = (monsterY1 + monsterY2) / 2;
                ctx.font = '16px Arial';
                ctx.fillStyle = 'purple';
                ctx.fillText(`${distanceBetweenMonsters.toFixed(2)}`, midX, midY);
            }
        }
    }
     if (bestPathArray?.length > 0) {
        ctx.strokeStyle = "purple"; // Define line color
        ctx.lineWidth = 5; // Line width based on path step size from SETTINGS

        // Função auxiliar para desenhar uma seta entre dois pontos
        function drawArrow(fromX, fromY, toX, toY) {
            const headLength = 15; // Tamanho da "cabeça" da seta
            const dx = toX - fromX;
            const dy = toY - fromY;
            const angle = Math.atan2(dy, dx); // Calcula o ângulo da linha

            // Desenha a linha da seta
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);

            // Desenha a "cabeça" da seta
            ctx.lineTo(
                toX - headLength * Math.cos(angle - Math.PI / 6),
                toY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(toX, toY);
            ctx.lineTo(
                toX - headLength * Math.cos(angle + Math.PI / 6),
                toY - headLength * Math.sin(angle + Math.PI / 6)
            );
        }

        ctx.beginPath();

        // Convert the first position of the path and start drawing
        let prevX = dw.toCanvasX(bestPathArray[0].x);
        let prevY = dw.toCanvasY(bestPathArray[0].y);

        // Draw arrows between all points on the path
        for (let i = 1; i < bestPathArray.length; i++) {
            let currentX = dw.toCanvasX(bestPathArray[i].x);
            let currentY = dw.toCanvasY(bestPathArray[i].y);
            
            drawArrow(prevX, prevY, currentX, currentY); // Desenha a seta

            // Atualiza a posição anterior
            prevX = currentX;
            prevY = currentY;
        }

        // Finish drawing the path with arrows
        ctx.stroke();
    }
});
