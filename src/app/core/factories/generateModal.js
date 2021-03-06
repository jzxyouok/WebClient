angular.module('proton.core')
.factory('generateModal', (pmModal, networkActivityTracker, Key, pmcw, notify, $q, $rootScope) => {
    return pmModal({
        controllerAs: 'ctrl',
        templateUrl: 'templates/modals/generate.tpl.html',
        controller(params, $scope) {
            // Variables
            const promises = [];
            const QUEUED = 0;
            const GENERATING = 1;
            const DONE = 2;
            const SAVED = 3;
            const ERROR = 4;

            // Parameters
            this.size = 2048;
            this.process = false;
            this.title = params.title;
            this.addresses = params.addresses;
            this.message = params.message;
            // Kill this for now
            this.askPassword = 0; //= params.password.length === 0;
            this.password = params.password;
            _.each(this.addresses, (address) => { address.state = QUEUED; });

            // Listeners
            // FIXME
            // This is broken because authentication depends on generateModal and we can't have circular dependencies
            // It is also bad logic, because which dirty addresses could change and this does not address that
            // Better to just close the modal
            const unsubscribe = $rootScope.$on('updateUser', () => {
                // var dirtyAddresses = [];

                // _.each(authentication.user.Addresses, function(address) {
                //     if (address.Keys.length === 0 && address.Status === 1 && authentication.user.Private === 1) {
                //         dirtyAddresses.push(address);
                //     }
                // });

                // if (dirtyAddresses.length === 0) {
                //     params.close(false);
                // }
                // params.close(false);
            });

            // Functions
            this.submit = function () {
                const numBits = this.size;

                this.process = true;
                _.each(this.addresses, (address) => {
                    address.state = GENERATING;
                    promises.push(pmcw.generateKeysRSA('<' + address.Email + '>', this.password, numBits)
                    .then((result) => {
                        const privateKeyArmored = result.privateKeyArmored;

                        address.state = DONE;

                        return Key.create({
                            AddressID: address.ID,
                            PrivateKey: privateKeyArmored
                        }).then((result) => {
                            if (result.data && result.data.Code === 1000) {
                                address.state = SAVED;
                                address.Keys = address.Keys || [];
                                address.Keys.push(result.data.Key);
                                notify({ message: 'Key created', classes: 'notification-success' });
                                return $q.resolve();
                            } else if (result.data && result.data.Error) {
                                address.state = ERROR;
                                notify({ message: result.data.Error, classes: 'notification-danger' });

                                return $q.reject();
                            }
                            address.state = ERROR;
                            notify({ message: 'Error during create key request', classes: 'notification-danger' });

                            return $q.reject();
                        }, () => {
                            address.state = ERROR;
                            notify({ message: 'Error during the create key request', classes: 'notification-danger' });

                            return $q.reject();
                        });
                    }, (error) => {
                        address.state = ERROR;
                        notify({ message: error, classes: 'notification-danger' });

                        return $q.reject();
                    }));
                });

                $q.all(promises)
                .finally(() => {
                    params.close(true, this.addresses, this.password);
                });
            };

            this.cancel = function () {
                params.close(false);
            };

            $scope.$on('$destroy', () => {
                unsubscribe();
            });
        }
    });
});
