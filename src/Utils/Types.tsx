// Generic types
export interface ObjectType {
  _id: string;
  meta: { model: string };
  [key: string]: any;
}
export interface ColorType {
  r: string;
  g: string;
  b: string;
}

/* Object types */
export interface SystemTaskObjectType extends ObjectType {
  description: string;
  type: "system-update" | "install-app" | "uninstall-app";
  done: boolean;
  progress: number;
  args?: { [key: string]: any };
}
