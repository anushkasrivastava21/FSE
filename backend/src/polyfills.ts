// This is a workaround for Nest.js dependency injection system
import "reflect-metadata";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

