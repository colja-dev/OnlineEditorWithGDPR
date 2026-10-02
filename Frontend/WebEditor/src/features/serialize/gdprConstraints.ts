import { Command, CommandExecutionContext, ILogger, NullLogger, SModelRootImpl, TYPES } from "sprotty";
import { Action } from "sprotty-protocol";
import { inject, optional } from "inversify";
import { Constraint, ConstraintRegistry } from "../constraintMenu/constraintRegistry";
import { LabelTypeRegistry } from "../labels/labelTypeRegistry";

export interface LoadGDPRConstraintsAction extends Action {
    kind: typeof LoadGDPRConstraintsAction.KIND;
    activate: boolean;
}
export namespace LoadGDPRConstraintsAction {
    export const KIND = "load-gdpr-constraints";

    export function create(activate: boolean = true): LoadGDPRConstraintsAction {
        return {
            kind: KIND,
            activate,
        };
    }
}

export class LoadGDPRConstraintsCommand extends Command {
    static readonly KIND = LoadGDPRConstraintsAction.KIND;
    readonly constraintAdress = "https://colja-dev.github.io/LegalComments/data.json";
    readonly dummyLabelAndType = {
        id: "99999",
        name: "DummyType0000",
        values: [{ id: "999991", text: "DummyLabel0000" }],
    };

    constructor(@inject(TYPES.Action) private readonly action: LoadGDPRConstraintsAction) {
        super();
    }

    @inject(TYPES.ILogger)
    private readonly logger: ILogger = new NullLogger();
    @inject(ConstraintRegistry)
    @optional()
    private readonly constraintRegistry?: ConstraintRegistry;
    @inject(LabelTypeRegistry)
    @optional()
    private labelTypeRegistry?: LabelTypeRegistry;

    async execute(context: CommandExecutionContext): Promise<SModelRootImpl> {
        if (this.action.activate) {
            const response = await fetch(this.constraintAdress);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const newConstraints = [];
            const list = this.constraintRegistry?.getConstraintList().filter((c) => !c.explanation);
            this.constraintRegistry?.clearConstraints();
            if (list) {
                newConstraints.push(...list);
            }
            data.forEach((item: any) => {
                newConstraints.push(this.mapToConstraint(item));
            });
            this.constraintRegistry?.setConstraintsFromArray(newConstraints);

            this.labelTypeRegistry?.registerLabelType(this.dummyLabelAndType);
        } else {
            const list = this.constraintRegistry?.getConstraintList()!;
            this.constraintRegistry?.clearConstraints();
            this.constraintRegistry?.setConstraintsFromArray(list.filter((c) => !c.explanation));
            this.labelTypeRegistry?.unregisterLabelType(this.dummyLabelAndType);
        }
        return context.root;
    }

    private mapToConstraint(item: any): Constraint {
        return {
            name: item.legalTerm.replace(/\s+/g, ""),
            constraint: this.hardCodeConstraints(item.legalTerm),
            explanation: item.description,
        };
    }

    private hardCodeConstraints(name: string): string {
        if (name.startsWith("Performance")) {
            return "data NaturalPerson.alice neverFlows vertex !Contract.contractAlice";
        } else if (name.startsWith("Exercise")) {
            return "data NaturalPerson.mallory neverFlows vertex !PublicAuthority.authorityMallory";
        } else if (name.startsWith("Consent")) {
            return "data NaturalPerson.joe neverFlows vertex !Consent.consentJoe";
        } else if (name.startsWith("Purposes")) {
            return "data NaturalPerson.$NaturalPerson neverFlows vertex !Purposes.$Purposes ";
        } else return "data NaturalPerson.$NaturalPerson neverFlows vertex DummyType0000.DummyLabel0000";
    }
}
