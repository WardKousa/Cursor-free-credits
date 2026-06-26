package com.example.cusforfreecredits.user.api;

import com.example.cusforfreecredits.authentication.RequiresRole;
import com.example.cusforfreecredits.authentication.Role;
import com.example.cusforfreecredits.user.api.model.UserDetails;
import com.example.cusforfreecredits.user.api.model.UserProfile;
import io.fluxzero.sdk.persisting.eventsourcing.Apply;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RequiresRole(Role.ADMIN)
public record CreateUser(@NotNull UserId userId,
                         @NotNull @Valid UserDetails details,
                         Role role) implements UserUpdate {
    @Apply
    UserProfile apply() {
        return UserProfile.builder().userId(userId).details(details).role(role).build();
    }
}
