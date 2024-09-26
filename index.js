const IS_ACTIVE = true;
dw.debug = true;
let lastPosition = { x: dw.character.x, y: dw.character.y };
let lastMoveTime = Date.now();
let bestTarget = null
const visitedPositions = [];
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
    globalProximityToAction: 0.4,
    globalSafePositioning: 0.8,
    visionConeAngle: Math.PI * 1.15, 
    visionConeRadius: 3.2, 
    predictionTime: 3, 
    pathStepSize: 1,
    maxPathfindingIterations: 500,
    interpolationSteps: 100,
    gooProximityRange: 2,
    monsterProximityRange: 1.5,
    zoneLevelSuicide: 0,
    scoreLimit: -10,
    idleTime: 1005,
};

/**
 * Configuration flags for various behaviors
 */
const CONFIG = {
    exploreNewAreas: false,
    removeItems: true,
    combineItems: true,
    sortItems: true,
    suicideAtZoneLevel: true,
    suicideUnderground: true,
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

const SKILLS = {
    attack: {
        enable: true,
        index: 0,
        range: 0.7,
    },
    attack_exertion: {
        enable: true,
        index: 5,
        range: 0.7,
    },
    shield: {
        enable: true,
        index: 2,
        range: 0.5,
        withBomb: true
    },
    heal: {
        enable: true,
        index: 1,
        range: 0.5,
        hpThreshold: 0.6,
        withMasochism: true
    },
    heal_alternative: {
        enable: false,
        index: 1,
        range: 0.5,
        hpThreshold: 0.6,
        withMasochism: false
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
        min_any_mod_quantity: 4, // Any mod with quality 8 or above should be kept
        min_any_mod_quality: 10, // Any mod with quality 8 or above should be kept
        mods_to_keep: ["masochism", "physborn", "fireborn"], // List of mods that will keep the item regardless of other conditions
        tags_to_keep: [],
        mds_to_keep: []
    },
    weapon: {
        mods: [
            "physDmgIncLocal", 
            "physDmgLocal", 
            "hpGain"
        ], // Mods to look for
        conditions: {
            operator: "OR", // Operator for combining conditions
            conditions: [
                { 
                    condition: "min_quantity", // Check for minimum number of mods
                    value: 2 // Minimum mods from the list required
                },
                { 
                    condition: "min_quality", // Check for minimum mod quality
                    value: 4 // At least one mod from the list should be >= 5 quality
                },
                { 
                    condition: "min_sum_quality", // Check for minimum sum of mod qualities
                    value: 7 // Combined quality of mods from the list should be >= 8
                }
            ]
        }
    },
    accessory: {
        mods: ["physDmg", "dmg", "hp", "hpRegen"], // Mods to look for
        conditions: {
            operator: "AND", // Operator for combining conditions
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 4
                },
                { 
                    condition: "min_sum_quality", 
                    value: 7 
                }
            ]
        }
    },
    armor: {
        mods: ["hp", "dmg", "hpRegen", "physDmg"], // Mods to look for
        conditions: {
            operator: "AND", // Operator for combining conditions
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2
                },
                { 
                    condition: "min_quality", 
                    value: 4
                },
                { 
                    condition: "min_sum_quality", 
                    value: 7
                }
            ]
        }
    },
    rune: {
         conditions: {
            operator: "AND", // Operator for combining conditions
            conditions: [
                { 
                    condition: "min_socket", // Check for minimum number of mods
                    value: 4 // Minimum mods from the list required
                }
            ]
        }
    },
    passive: {
        mods: ["hpInc", "hpRegenInc", "gcdr", "physDmgInc", "dmg", "dmgInc", "physDmg"], // Mods to look for
        conditions: {
            operator: "OR",
            conditions: [
                { 
                    condition: "min_quantity", 
                    value: 2 // At least 2 mods from the list
                },
                { 
                    condition: "min_quality", 
                    value: 5 // At least one mod from the list has to be equal or greater than 4
                },
                { 
                    condition: "min_sum_quality", 
                    value: 7 // Combined quality of mods from the list should be >= 6
                },
                { 
                    condition: "min_sum_quality_total", 
                    value: 10 // Combined quality of mods from the list should be >= 8
                }
            ]
        }
    },
    combine: ["wood", "flax", "rock", "portalScroll"],  // Combineable resource items
};

const SCORE = {
    monster: {
        /**
         * Base score for all monsters. 
         * Ensures that monsters have a starting priority over resources.
         */
        baseScore: 15,

        /**
         * Bonus if the monster is injured (current HP < max HP).
         * Prioritizes monsters that are easier to defeat due to lower HP.
         */
        injuredBonus: 10,

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
        rareMonsterMultiplier: 30,

        /**
         * Rarity level threshold. Monsters with rarity above this level are avoided,
         * as they are considered too strong to defeat.
         */
        rareMonsterLimit: 6,

        /**
         * HP threshold. Monsters with max HP above this level are avoided,
         * as they are considered too tough to handle, even if their rarity is low.
         */
        rareMonsterHpThreshold: 40000,
    },

    resource: {
        /**
         * Base score for resources. Generally negative because resources are deprioritized 
         * compared to monsters, unless gathering resources is specifically required.
         */
        baseScore: -20
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
        nearbyMonster: -20,

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
        differenceFactor: -3
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
     * Generates a safe path from the character's position to a target position, avoiding monsters.
     * @param {Object} characterPos - The starting position (x, y).
     * @param {Object} targetPos - The target position (x, y, dx, dy) of the monster, including direction.
     * @returns {Array<Object>} The safe path as an array of positions (x, y).
     */
    generateSafePath(characterPos, targetPos) {
        let adjustedTargetPos = targetPos
        if(targetPos.md && dw.mdInfo[targetPos.md].isMonster && targetPos.bad > 0) {
            const safePosition = Util.calculateSafePosition(targetPos, SETTINGS.globalProximityToAction);
            adjustedTargetPos = {
                ...targetPos,
                x: safePosition.x,
                y: safePosition.y,
            };
        }
        
        // Checa se a distância entre o personagem e o target ajustado é menor que 0.7
        if (dw.distance(characterPos.x, characterPos.y, adjustedTargetPos.x, adjustedTargetPos.y) < 1) {
            return [characterPos, adjustedTargetPos];
        }

        // Continua com o cálculo do caminho seguro
        const openList = [];
        const closedList = [];
        const path = [];
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
        ];

        let iterations = 0;

        const startNode = new Node(characterPos, 0, dw.distance(characterPos.x, characterPos.y, adjustedTargetPos.x, adjustedTargetPos.y));
        openList.push(startNode);

        while (openList.length > 0) {
            iterations++;
            if (iterations > SETTINGS.maxPathfindingIterations) {
                console.log("Iteration limit reached. Aborting!");
                return path.reverse(); // Retorna o caminho gerado até aqui
            }

            // Seleciona o nó com o menor custo total (f)
            let currentNode = openList.reduce((prev, node) => node.f < prev.f ? node : prev);

            // Se o destino foi alcançado, constrói o caminho
            if (dw.distance(currentNode.pos.x, currentNode.pos.y, adjustedTargetPos.x, adjustedTargetPos.y) <= SETTINGS.pathStepSize) {
                let node = currentNode;
                while (node) {
                    path.push(node.pos);
                    node = node.parent;
                }
                path.reverse(); // Retorna o caminho da origem ao destino

                // Garante que o último ponto seja exatamente o targetPos ajustado
                if (path.length === 0 || (path[path.length - 1].x !== adjustedTargetPos.x || path[path.length - 1].y !== adjustedTargetPos.y)) {
                    path.push(adjustedTargetPos); // Adiciona o ponto de destino ajustado se não estiver no caminho
                }

                return path;
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
                return distA - distB; // Ordena da mais próxima para a mais distante
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

                // Se o nó vizinho não está na lista aberta, ou se o novo caminho é mais barato
                if (!neighborNode) {
                    const hScore = dw.distance(newPos.x, newPos.y, adjustedTargetPos.x, adjustedTargetPos.y);
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
        return path; // Retorna o caminho gerado até o momento ou vazio se nenhum caminho foi encontrado
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
                !entity.isSafe
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

            // If the target is a monster
            if (dw.mdInfo[monster.md].isMonster) {
                score += SCORE.monster.baseScore; // Apply base score for monsters
                if (monster.hp < monster.maxHp) {
                    score += SCORE.monster.injuredBonus; // Apply bonus if the monster is injured
                }
                score += Util.checkGooProximity(monster) * SCORE.proximity.goo; // Apply goo proximity adjustment
                score += Util.checkMonsterNearby(monster) * SCORE.proximity.nearbyMonster; // Apply adjustment for nearby monsters
                if ([dw.character.id, ...Finder.getFollowCharacters()].includes(monster.targetId)) {
                    score += SCORE.monster.targetCharacterBonus; // Apply bonus if the monster is targeting the character
                }
                score += Util.distanceToTarget(monster) * SCORE.proximity.distanceMultiplier; // Apply unified distance-based score adjustment

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
                    const levelDifference = Math.abs(monster.lvl - dw.c.lvl);
                    score += (levelDifference === 0) ? SCORE.levelDifference.sameLevelBonus
                        : levelDifference * SCORE.levelDifference.differenceFactor;
                }
            }

            // If the target is a resource
            if (dw.mdInfo[monster.md].isResource) {
                score += SCORE.resource.baseScore; // Apply base score for resources
                score += Util.distanceToTarget(monster) * SCORE.proximity.distanceMultiplier; // Apply unified distance-based score adjustment
                score += Util.checkMonsterNearby(monster) * SCORE.proximity.nearbyMonster; // Apply adjustment for nearby monsters
                score += Util.countMonstersAlongPath(monster) * SCORE.path.monstersAlongPath; // Apply adjustment for monsters along the path
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
            if(m.monster.targetId === dw.c.i) {
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
                toGather: dw.mdInfo[target?.monster?.md]?.isResource
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
                }
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
            (!Character.hasMasochism() && SKILLS.heal.withMasochism) &&
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
    followAndAttack(target, needRecovery = false) {
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

            if(SKILLS.attack_exertion.enable && target.r > 0) {
                attackSkill = SKILLS.attack_exertion.index
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
        if (dw.distance(dw.character.x, dw.character.y, lastPosition.x, lastPosition.y) <= 0.5 && currentTime - lastMoveTime >= 1000 * SETTINGS.idleTime) {
            DEBUG.log("Character idle for 3 minute, committing suicide.");
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
    moveCloserToTarget(target, safeDistance = 0) {
        let { x, y, dx, dy } = target

        
        if (target?.path) {
            DEBUG.log(`<span style="color: lime">Pathfinding</span> to <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
            x = target.path[1].x
            y = target.path[1].y
            if(dw.mdInfo[target.md].isMonster) {
                Movement.getCloserPath(target.path);
            }
        } else {
            DEBUG.log(`<span style="color: lime">Moving</span> to <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
            if(dw.mdInfo[target.md].isMonster) {
                Movement.getCloserMove(target);
            }
        }

        if(safeDistance !== 0) {
            DEBUG.log(`<span style="color: lime">Safe Positioning</span> to <span style="color: cyan">${dw.mdInfo[target.md].name}</span>`);
            const safePoint = Util.calculateSafePosition({ ...target, x, y}, safeDistance)
            x = safePoint.x
            y = safePoint.y
        }
        dw.move(x, y);
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
        if (!CONFIG.enableRandomMovement) return;

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
     * Follows a protected allied character.
     */
    followAllied() {
        if (!CONFIG.followAlliedCharacter) return;

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
        if (!CONFIG.healAndFollowAllied) return;

        const target = Finder.getHealTarget();
        if (target) {
            const distToTarget = Util.distanceToTarget(target);
            DEBUG.log(`Attempting to heal ${target.name}. Current distance: ${distToTarget}`);
            if (target.hp <= target.maxHp * 0.9) {
                if (dw.canUseSkill(SKILLS.heal.index, target.id)) {
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
            bestTarget = Movement.findPath(monsterFinder[0].monster); // Generate the safest path to the monster
        }
    },

    visitedPositions: [],

    /**
     * Adds or updates a position in the visited set with a score.
     * If the position is new, it will be added with an initial score of 1.
     * If the position exists, its score will be incremented.
     * @param {number} x - X-coordinate.
     * @param {number} y - Y-coordinate.
     */
    markPositionAsVisited(x, y) {
        const existingPos = Movement.visitedPositions.find(pos => Math.hypot(pos.x - x, pos.y - y) <= 0.5);
        if (existingPos) {
            existingPos.score++; // Increment the score if the position is revisited
        } else {
            Movement.visitedPositions.push({ x, y, score: 1 }); // Add a new position with score 1
        }
    },

    /**
     * Checks if a position has been visited and retrieves the visitation score.
     * If the position exists, return its score; otherwise, return 0 for unvisited.
     * @param {number} x - X-coordinate.
     * @param {number} y - Y-coordinate.
     * @returns {number} The visitation score (0 if unvisited).
     */
    getPositionVisitScore(x, y) {
        const pos = Movement.visitedPositions.find(pos => Math.hypot(pos.x - x, pos.y - y) <= 0.5);
        return pos ? pos.score : 0; // Return score if visited, otherwise 0
    },

    /**
     * Removes points from visitedPositions that are more than 30 units away from the current position.
     */
    cleanupDistantVisitedPoints() {
        const currentPos = { x: dw.character.x, y: dw.character.y };
        Movement.visitedPositions = Movement.visitedPositions.filter(pos => {
            const distance = Math.hypot(pos.x - currentPos.x, pos.y - currentPos.y);
            return distance <= 30; // Keep points that are within 30 units
        });
    },

    /**
     * Explore new areas by moving to positions with the lowest visitation score within a 5-unit radius.
     * Avoids recently visited areas and ensures proper movement away from high-visited areas.
     * @returns {Object|null} The next direction to move, or null if no valid movement is found.
     */
    exploreNewAreas() {
        if(!CONFIG.exploreNewAreas) {
            return
        }
        
        const currentPos = { x: dw.character.x, y: dw.character.y };

        // Cleanup distant points before exploring new areas
        Movement.cleanupDistantVisitedPoints();

        // Mark current position as visited
        Movement.markPositionAsVisited(currentPos.x, currentPos.y);

        const maxDistance = 5; // Maximum distance to move (increase to avoid small steps)
        const directions = [
            { x: maxDistance, y: 0 }, { x: -maxDistance, y: 0 }, // Left and Right
            { x: 0, y: maxDistance }, { x: 0, y: -maxDistance }, // Up and Down
            { x: maxDistance, y: maxDistance }, { x: -maxDistance, y: maxDistance }, // Diagonals
            { x: maxDistance, y: -maxDistance }, { x: -maxDistance, y: -maxDistance } // Diagonals
        ];

        // Sort directions based on visitation score and distance from dense clusters
        directions.sort((a, b) => {
            const scoreA = Movement.getPositionVisitScore(currentPos.x + a.x, currentPos.y + a.y);
            const scoreB = Movement.getPositionVisitScore(currentPos.x + b.x, currentPos.y + b.y);
            const distA = Math.hypot(currentPos.x + a.x, currentPos.y + a.y);
            const distB = Math.hypot(currentPos.x + b.x, currentPos.y + b.y);

            // Prioritize areas with lower scores (less visited) and further distances
            if (scoreA !== scoreB) {
                return scoreA - scoreB; // Prioritize areas with fewer visits
            }
            return distB - distA; // Prioritize areas further from the current position
        });

        // Try each direction, moving to less visited positions
        for (const dir of directions) {
            const newPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };

            // Ensure the new position is safe and avoid high-visitation bubbles
            if (Util.isSafe(newPos) && !Util.isPathBlocked(newPos)) {
                DEBUG.log(`Exploring new area at [${newPos.x}, ${newPos.y}]`);
                const path = Movement.findPath(newPos);

                if (path?.path?.length > 1) {
                    dw.move(path.path[1].x, path.path[1].y);
                }
                return path;
            }
        }

        // If no valid movement is found, fallback to wall-following
        DEBUG.log("No valid paths found. Attempting to follow wall.");
        Movement.followWall(currentPos);

        return null; // No valid movement found
    },

    /**
     * Wall-following logic to handle cases where the character is stuck or blocked.
     * Attempts to "hug" the wall by moving along its edge until a valid path is found.
     * @param {Object} currentPos - The character's current position.
     */
    followWall(currentPos) {
        const wallDirections = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, // Left and Right
            { x: 0, y: 1 }, { x: 0, y: -1 }, // Up and Down
            { x: 1, y: 1 }, { x: -1, y: 1 }, // Diagonals
            { x: 1, y: -1 }, { x: -1, y: -1 } // Diagonals
        ];

        // Try each wall-following direction
        for (const dir of wallDirections) {
            const newPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };

            // Move along the wall edge if possible
            if (Util.isSafe(newPos) && !Util.isPathBlocked(newPos)) {
                DEBUG.log(`Following wall at [${newPos.x}, ${newPos.y}]`);
                dw.move(newPos.x, newPos.y);
                return;
            }
        }

        // If all wall-following attempts fail, stay in place
        DEBUG.log("All wall-following attempts failed. Staying in place.");
    }
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
        return metaData?.isArmor || false;
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
    isPassive(item) {
        const metaData = dw.mdInfo[item.md];
        return Array.from(metaData?.tags || []).includes("passive");
    },

    // Condition functions to evaluate against the item
    conditions: {
        // Check if the item has at least a certain number of mods from the mod list
        min_quantity: (item, condition, mods) => {
            const modCount = Misc.countModsFromList(item, mods);
            return modCount >= condition.value;
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


    /**
 * Cleans the inventory by removing unwanted items, combining resources, and sorting the inventory.
 * Items are classified by mod quality, mod count, and specific mod criteria.
 */
cleanInventory() {
    const itemsToCombine = [];
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

        // Log the exclusion using DEBUG.log with color and reason
        DEBUG.log(`<span style="color: ${color};">${itemName}</span> (${modDetails}) excluded because: ${reason}`);
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
            itemsToRemove.push(index); // Mark for removal if conditions fail
        }

        // Evaluate conditions for armor
        else if (Misc.isArmor(item)) {
            const { conditions } = ITEMS.armor;
            const result = Misc.evaluateConditions(item, conditions, ITEMS.armor.mods);
            logEvaluation(item, result, 'Armor conditions evaluated');
            if (result) return;
            logExclusion(item, mods, 'Armor conditions failed');
            itemsToRemove.push(index); // Mark for removal if conditions fail
        }

        // Evaluate conditions for accessories
        else if (Misc.isAccessory(item)) {
            const { conditions } = ITEMS.accessory;
            const result = Misc.evaluateConditions(item, conditions, ITEMS.accessory.mods);
            logEvaluation(item, result, 'Accessory conditions evaluated');
            if (result) return;
            logExclusion(item, mods, 'Accessory conditions failed');
            itemsToRemove.push(index); // Mark for removal if conditions fail
        }

        // Evaluate conditions for runes
        else if (Misc.isRune(item)) {
            const { conditions } = ITEMS.rune;
            const result = Misc.evaluateConditions(item, conditions, []);
            logEvaluation(item, result, 'Rune socket conditions evaluated');
            if (result) return;
            logExclusion(item, mods, 'Rune conditions failed');
            itemsToRemove.push(index); // Mark for removal if conditions fail
        }

        // Evaluate conditions for passives
        else if (Misc.isPassive(item)) {
            const { conditions } = ITEMS.passive;
            const result = Misc.evaluateConditions(item, conditions, ITEMS.passive.mods);
            logEvaluation(item, result, 'Passive conditions evaluated');
            if (result) return;
            logExclusion(item, mods, 'Passive conditions failed');
            itemsToRemove.push(index); // Mark for removal if conditions fail
        }

        // Handle combinable resources
        else if (ITEMS.combine.includes(item.md) || dw.mdInfo[item.md]?.isMat) {
            logEvaluation(item, true, 'Item marked for combining');
            itemsToCombine.push(index);
        }
    });

    // Remove marked items
    if (CONFIG.removeItems && itemsToRemove.length > 0) {
        itemsToRemove.forEach(inventoryIndex => dw.deleteItem(inventoryIndex));
    }

    // Combine resources
    if (CONFIG.combineItems && itemsToCombine.length > 0) {
        dw.combineItems(itemsToCombine);
    }

    // Sort inventory after cleaning
    if (CONFIG.sortItems) {
        dw.sortInventory();
    }
}

};


/**
 * Event handling and game loop
 */
const eventPriority = [
    Movement.checkCharacterIdle,
    Movement.checkTerrain,
    Movement.checkZoneLevel,
    Misc.cleanInventory,
    Action.useHealSkill,
    Action.useHealAlternativeSkill,
    Action.useGraftSkill,
    Action.useShieldSkill,
    Finder.getNearestToTaunt,
    Finder.getNextMonster,
    Movement.moveShrub,
    Movement.moveMission,
    Movement.followAllied,
    Movement.followAndHealAllied,
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
                                        (dw.character.hp !== dw.character.maxHp)

        // Handle skill-based actions
        if (target.toSkill >= 0) {
            Action.followAndUseSkill(target, target.toSkill);
        }
        // Handle attack actions
        else if (target.toAttack) {
            Action.followAndAttack(target, needRecovery);
        }
        // Handle gathering actions
        else if (target.toGather) {
            Movement.moveAndGather(target);
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
    if (IS_ACTIVE) {
        handleGameEvents();
    }
    setTimeout(gameLoop, 350); // Re-run the loop every 250ms
}

gameLoop();

dw.on('drawUnder', (ctx) => {
    function drawArrow(fromX, fromY, toX, toY) {
    const headLength = 15; // Tamanho da cabeça da seta
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx); // Calcula o ângulo da linha

    // Desenha a linha da seta (corpo)
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke(); // Necessário para desenhar a linha

    // Desenha a "cabeça" da seta
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
    ctx.lineTo(toX, toY); // Fecha a cabeça da seta
    ctx.stroke(); // Necessário para desenhar a cabeça da seta
}


    const monsterFinder = Finder.getMonstersByScore(e => dw.mdInfo[e.md]?.isMonster) || [];

    // Get character's canvas coordinates
    const characterX = dw.toCanvasX(dw.c.x);
    const characterY = dw.toCanvasY(dw.c.y);

    // Draw visited areas with bubbles representing visitation scores
    Movement.visitedPositions.forEach(pos => {
        const canvasX = dw.toCanvasX(pos.x);
        const canvasY = dw.toCanvasY(pos.y);

        // Set bubble color based on the visitation score (higher score = darker color)
        // Example: more visited areas get a darker green, less visited are lighter green.
        let alpha = Math.min(pos.score / 10, 1); // Cap alpha at 1 for highly visited areas
        ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 6})`; // Green color with varying transparency based on score

        const radius = dw.constants.PX_PER_UNIT_ZOOMED * 0.5; // Bubble radius for each visited area

        // Draw the bubble
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
        ctx.fill();
    });

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
        
        // Array of rainbow colors (ROYGBIV: Red, Orange, Yellow, Green, Blue, Indigo, Violet)
        const rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

        // Check for rare monster and draw concentric circles
        if (monster.r > 0) {
            const numCircles = monster.r;
            const circleSpacing = 12;
            for (let j = 0; j < numCircles; j++) {
                // Cycle through rainbow colors
                const colorIndex = j % rainbowColors.length;
                ctx.strokeStyle = rainbowColors[colorIndex];
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

         // Calcula a posição atrás do monstro
        const safePosition = Util.calculateSafePosition(monster1, SETTINGS.globalSafePositioning, true); // Posição atrás

        // Calcula a posição na frente do monstro
        const frontPosition = Util.calculateSafePosition(monster1, SETTINGS.globalSafePositioning, false); // Posição à frente

        // Desenha um ponto na posição do monstro (opcional)
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 6

            // Desenha uma seta atrás do monstro (posição segura)
        drawArrow(dw.toCanvasX(safePosition.x), dw.toCanvasY(safePosition.y), monsterX1, monsterY1);

        // Desenha uma seta na frente do monstro (na direção do movimento)
        drawArrow(monsterX1, monsterY1, dw.toCanvasX(frontPosition.x), dw.toCanvasY(frontPosition.y));
    }

     if (bestTarget && bestTarget?.path?.length > 0) {
        ctx.strokeStyle = "purple"; // Define line color
        ctx.lineWidth = 5; // Line width based on path step size from SETTINGS

        // Função auxiliar para desenhar uma seta entre dois pontos
        ctx.beginPath();

        // Convert the first position of the path and start drawing
        let prevX = dw.toCanvasX(bestTarget.path[0].x);
        let prevY = dw.toCanvasY(bestTarget.path[0].y);

        // Draw arrows between all points on the path
        for (let i = 1; i < bestTarget.path.length; i++) {
            let currentX = dw.toCanvasX(bestTarget.path[i].x);
            let currentY = dw.toCanvasY(bestTarget.path[i].y);
            
            drawArrow(prevX, prevY, currentX, currentY); // Desenha a seta

            // Atualiza a posição anterior
            prevX = currentX;
            prevY = currentY;
        }

        // Finish drawing the path with arrows
        ctx.stroke();
    }

});
