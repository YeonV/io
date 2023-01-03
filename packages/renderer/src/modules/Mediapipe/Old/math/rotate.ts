import {Landmark} from "@mediapipe/hands";

export function rotateX({x, y, z, visibility}: Landmark, angle: number): Landmark {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
        x: x,
        y: cos * y - sin * z,
        z: sin * y + cos * z,
        visibility
    }
}

export function rotateY({x, y, z, visibility}: Landmark, angle: number): Landmark {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
        x: cos * x + sin * z,
        y: y,
        z: -sin * x + cos * z,
        visibility
    }
}

export function rotateZ({x, y, z, visibility}: Landmark, angle: number): Landmark {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
        x: cos * x - sin * y,
        y: sin * x + cos * y,
        z: z,
        visibility
    }
}