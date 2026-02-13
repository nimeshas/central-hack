// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MedicalRecord {

    // Define what a "Record" looks like
    struct Record {
        string ipfsHash;  // The "fingerprint" of the file stored on Pinata
        string fileName;  // Readable name (e.g., "X-Ray Chest")
        address doctor;   // Who uploaded it
        uint256 timestamp; // When it was uploaded
    }

    // Map a Patient's Wallet Address -> List of their Records
    mapping(address => Record[]) private patientRecords;

    // Events help your frontend know when something happened
    event RecordAdded(address indexed patient, string ipfsHash, address indexed doctor);

    // Function 1: Upload a record (Only creates the link, doesn't store the file)
    function addRecord(address _patient, string memory _ipfsHash, string memory _fileName) public {
        Record memory newRecord = Record({
            ipfsHash: _ipfsHash,
            fileName: _fileName,
            doctor: msg.sender,
            timestamp: block.timestamp
        });

        patientRecords[_patient].push(newRecord);

        emit RecordAdded(_patient, _ipfsHash, msg.sender);
    }

    // Function 2: View a patient's records
    function getRecords(address _patient) public view returns (Record[] memory) {
        return patientRecords[_patient];
    }

    // Function 3: Allow a patient to delete their own record (Optional/Advanced)
    // For a hackathon, you usually skip deletion logic to save time!
}
