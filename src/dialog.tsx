import "dialog.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";

import Spinner = require("react-spinkit");

import WIT_Client = require("TFS/WorkItemTracking/RestClient");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");

import Q = require("q");

import { IWorkItem, IDialogInputData, IResultWorkItem } from "interfaces";

import { WorkItemTypeService } from "services/workItemTypeService";
import { WorkItemCreator } from "services/workItemCreator";

import { MainComponent } from "components/mainComponent";

import { Store } from "store";
import { ActionsCreator } from "actionsCreator";

let inputData: IDialogInputData = VSS.getConfiguration();

let typeServiceInitPromise = WorkItemTypeService.getInstance().init();
let parentWorkItemPromise = WIT_Client.getClient().getWorkItem(
    inputData.workItemId, ["System.Id", "System.WorkItemType", "System.Title", "System.IterationPath", "System.AreaPath"]);

Q.all<any>([typeServiceInitPromise, parentWorkItemPromise]).then<void>(values => {
    let workItem: WIT_Contracts.WorkItem = values[1];

    let parentWorkItem: IWorkItem = {
        id: workItem.fields["System.Id"],
        title: workItem.fields["System.Title"],
        level: WorkItemTypeService.getInstance().getLevelForType(workItem.fields["System.WorkItemType"]),
        relativeLevel: 0
    };
    
    let parentIterationPath = workItem.fields["System.IterationPath"];
    let parentAreaPath = workItem.fields["System.AreaPath"];

    let store = new Store(parentWorkItem);
    let actionsCreator = new ActionsCreator(store);

    ReactDOM.render(<MainComponent
        store={ store }
        actionsCreator={ actionsCreator } />, document.getElementById("content"));

    store.addListener(() => {
        let isValid = store.getIsValid();
        inputData.onUpdate(isValid);
    });

    inputData.setSaveHandler(() => {
        // react-spinkit typings are not correct, work around by casting to any
        let spinner = React.createElement(Spinner as any, { spinnerName: "rotating-plane", noFadeIn: true });

        ReactDOM.render(<div className="saving-indicator">
            { spinner }
            <div>Saving</div>
        </div>, document.getElementById("content"));

        let resultTree = store.getResult();
        let creator = new WorkItemCreator(store.getParentItem().id, parentIterationPath, parentAreaPath);
        return creator.createWorkItems(resultTree);
    });
});