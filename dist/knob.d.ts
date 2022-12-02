declare module "knob" {
    export class KNOB {
        /**
         * @param {KNOB_CONFIG} config
         * @param {BABYLON.Scene} scene
         * @param {boolean} [draftMode] [WIP - NOT IMPLEMENTED] Doesn't combine meshes and doesn't perform CSG.
         * Meshes will be transuncent to see through. This is mainly for performance reasons
         */
        constructor(config: KNOB_CONFIG, scene: BABYLON.Scene, draftMode?: boolean);
        scene: BABYLON.Scene;
        /**
         * @param {KNOB_CONFIG} config
         */
        fillDefaults(config: KNOB_CONFIG): void;
        /** @type {KNOB_CONFIG} */
        config: KNOB_CONFIG;
        /**
         * @param {KNOB_CONFIG} config
         * @param {(keyof KNOB_CONFIG)[]} [partsToUpdate]
         */
        update(config: KNOB_CONFIG, partsToUpdate?: (keyof KNOB_CONFIG)[]): void;
        pointerShape: BABYLON.Mesh;
        baseShape: BABYLON.Mesh;
        screwHoleShape: BABYLON.Mesh;
        bodyShape: BABYLON.Mesh;
        /**
         * Knob is a combination of body, lips and internal stucture
         * First create the shape that will make a body
         * @param {KNOB_BODY} bodyConfig
         * @returns {BABYLON.Mesh}
         */
        _createBody(bodyConfig: KNOB_BODY): BABYLON.Mesh;
        /**
         * @param {KNOB_SLOT} screwHoleConfig
         * @returns {BABYLON.Mesh}
         */
        _createScrewHole(screwHoleConfig: KNOB_SLOT): BABYLON.Mesh;
        /**
         * @param {BABYLON.Mesh} a
         * @param {BABYLON.Mesh} b
         * @param {string} name
         * @returns {BABYLON.Mesh}
         */
        _performSubstractiveCSG(a: BABYLON.Mesh, b: BABYLON.Mesh, name: string): BABYLON.Mesh;
        /**
         * @param {BABYLON.Vector3} startPoint
         * @param {BABYLON.Vector3} endPoint
         * @param {number} smoothing
         * @param {boolean} [opposite]
         * @returns {BABYLON.Vector3[]}
         */
        _tessellatePath(startPoint: BABYLON.Vector3, endPoint: BABYLON.Vector3, smoothing: number, opposite?: boolean): BABYLON.Vector3[];
        /**
         * @param {KNOB_BODY_OPTIONS} config
         * @returns {BABYLON.Vector3[]}
         */
        _createLinearShape(config: KNOB_BODY_OPTIONS): BABYLON.Vector3[];
        /**
         * @param {KNOB_POINTER} config
         * @returns {BABYLON.Mesh}
         */
        _createPointer(config: KNOB_POINTER): BABYLON.Mesh;
        dispose(): void;
        exportSTL(): void;
    }
    export type KNOB_BODY_OPTIONS = {
        height: number;
        radius: number;
        /**
         * when not available is equal to radius
         */
        topRadius?: number;
        /**
         * When not available is equal to radius
         */
        bottomRadius?: number;
        sides?: number;
        /**
         * section along the height representative
         * of the radius. default is 0.5
         */
        balance?: number;
    };
    export type ONLY_KNOB_BODY = {
        /**
         * 0 is linear and 1 is curvy
         */
        smoothing?: number;
    };
    export type KNOB_BODY = KNOB_BODY_OPTIONS & ONLY_KNOB_BODY;
    export type KNOB_POINTER = {
        height?: number;
        offset?: number;
        position?: number;
        rStart?: number;
        rEnd?: number;
        widthStart?: number;
        widthEnd?: number;
    };
    export type ONLY_KNOB_SLOT = {
        /**
         * same as body options but defaults to one
         */
        balance?: number;
        offset?: number;
    };
    export type KNOB_SLOT = KNOB_BODY_OPTIONS & ONLY_KNOB_SLOT;
    export type KNOB_CONFIG = {
        body: KNOB_BODY;
        pointer?: KNOB_POINTER;
        screwHole?: KNOB_SLOT;
    };
    import * as BABYLON from "babylonjs";
}
